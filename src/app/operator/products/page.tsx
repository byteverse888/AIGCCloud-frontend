'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface ReviewProduct {
  id: string;
  name: string;
  creator: string;
  creatorId: string;
  category: string;
  price: number;
  status: string;
  submittedAt: string;
  description: string;
}

type BulkAction = 'approve' | 'reject' | 'offline';

export default function OperatorProductsPage() {
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [creatorIdInput, setCreatorIdInput] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ReviewProduct | null>(null);
  const pageSize = 20;

  // 批量管理状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>('reject');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPendingProducts({
        page,
        limit: pageSize,
        status: activeTab,
        creatorId: creatorId.trim() || undefined,
      });
      const mapped: ReviewProduct[] = (res.data || []).map((p: Record<string, unknown>) => ({
        id: (p.objectId as string) || (p.id as string) || '',
        name: (p.name as string) || '',
        creator: (p.creatorName as string) || (p.creatorAddress as string) || '',
        creatorId: (p.creatorId as string) || '',
        category: (p.category as string) || '',
        price: (p.price as number) || 0,
        status: (p.status as string) || 'pending',
        submittedAt: (p.createdAt as string) || '',
        description: (p.description as string) || '',
      }));
      setProducts(mapped);
      setTotal(res.total || 0);
    } catch {
      toast.error('加载商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, creatorId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 切换 Tab 回到第一页并清空选中
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  // 仅对当前页做前端搜索
  const displayProducts = useMemo(() => {
    if (!searchTerm) return products;
    const kw = searchTerm.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(kw) || p.creator.toLowerCase().includes(kw)
    );
  }, [products, searchTerm]);

  // 当前页（过滤后）可批量操作的商品
  const bulkEligibleIds = useMemo(() => {
    const eligibleStatuses =
      activeTab === 'pending' ? ['pending'] : activeTab === 'approved' ? ['approved'] : [];
    return displayProducts.filter((p) => eligibleStatuses.includes(p.status)).map((p) => p.id);
  }, [displayProducts, activeTab]);

  const bulkEnabled = activeTab === 'pending' || activeTab === 'approved';
  const allSelectedOnPage =
    bulkEligibleIds.length > 0 && bulkEligibleIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bulkEligibleIds));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleApprove = async (productId: string) => {
    try {
      await adminApi.reviewProduct({ product_id: productId, status: 'approved' });
      toast.success('已通过');
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status: 'approved' } : p)));
    } catch {
      toast.error('操作失败');
    }
  };

  const openRejectDialog = (product: ReviewProduct) => {
    setSelectedProduct(product);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const isOfflineAction = selectedProduct?.status === 'approved';

  const handleReject = async () => {
    if (!selectedProduct || !rejectReason.trim()) {
      toast.error(isOfflineAction ? '请填写下架原因' : '请填写驳回原因');
      return;
    }
    const nextStatus = isOfflineAction ? 'offline' : 'rejected';
    try {
      await adminApi.reviewProduct({
        product_id: selectedProduct.id,
        status: nextStatus,
        review_note: rejectReason,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, status: nextStatus } : p))
      );
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedProduct(null);
      toast.success(isOfflineAction ? '商品已驳回下架' : '商品已驳回');
    } catch {
      toast.error('操作失败');
    }
  };

  // 批量通过
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`确定要批量通过 ${ids.length} 个商品吗？`)) return;
    setBulkProcessing(true);
    try {
      const res = await adminApi.batchReviewProducts({ product_ids: ids, status: 'approved' });
      toast.success(`批量通过完成：成功 ${res.success_count}/${res.total}`);
      clearSelection();
      fetchProducts();
    } catch {
      toast.error('批量操作失败');
    } finally {
      setBulkProcessing(false);
    }
  };

  const openBulkDialog = (action: Exclude<BulkAction, 'approve'>) => {
    setBulkAction(action);
    setBulkReason('');
    setBulkDialogOpen(true);
  };

  const handleBulkConfirm = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!bulkReason.trim()) {
      toast.error(bulkAction === 'offline' ? '请填写下架原因' : '请填写驳回原因');
      return;
    }
    setBulkProcessing(true);
    try {
      const res = await adminApi.batchReviewProducts({
        product_ids: ids,
        status: bulkAction === 'offline' ? 'offline' : 'rejected',
        review_note: bulkReason,
      });
      toast.success(
        `${bulkAction === 'offline' ? '批量下架' : '批量驳回'}完成：成功 ${res.success_count}/${res.total}`
      );
      setBulkDialogOpen(false);
      setBulkReason('');
      clearSelection();
      fetchProducts();
    } catch {
      toast.error('批量操作失败');
    } finally {
      setBulkProcessing(false);
    }
  };

  const ProductCard = ({ product }: { product: ReviewProduct }) => {
    const isEligible = bulkEnabled && bulkEligibleIds.includes(product.id);
    const checked = selectedIds.has(product.id);
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {bulkEnabled && (
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 cursor-pointer"
                  checked={checked}
                  disabled={!isEligible}
                  onChange={() => toggleSelect(product.id)}
                  aria-label="选择"
                />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{product.name}</h3>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{product.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>创作者: {product.creator || '-'} <span className="text-[11px]">({product.creatorId || '-'})</span></span>
                  <span>价格: ¥{product.price}</span>
                  <span>提交: {product.submittedAt}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
              {product.status === 'pending' && (
                <>
                  <Button size="sm" variant="default" onClick={() => handleApprove(product.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    通过
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openRejectDialog(product)}>
                    <XCircle className="h-4 w-4 mr-1" />
                    驳回
                  </Button>
                </>
              )}
              {product.status === 'approved' && (
                <>
                  <Badge className="bg-green-500">已通过</Badge>
                  <Button size="sm" variant="destructive" onClick={() => openRejectDialog(product)}>
                    <XCircle className="h-4 w-4 mr-1" />
                    驳回下架
                  </Button>
                </>
              )}
              {product.status === 'rejected' && <Badge variant="destructive">已驳回</Badge>}
              {product.status === 'offline' && <Badge variant="destructive">已下架</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">商品审批</h2>
          <p className="text-muted-foreground">审核创作者提交的商品 · 共 {total} 条</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="按创建者 userID 或 用户名 搜索..."
              value={creatorIdInput}
              onChange={(e) => setCreatorIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  setCreatorId(creatorIdInput.trim());
                }
              }}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage(1);
              setCreatorId(creatorIdInput.trim());
            }}
          >
            搜索
          </Button>
          {creatorId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreatorIdInput('');
                setCreatorId('');
                setPage(1);
              }}
            >
              清除
            </Button>
          )}
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="仅过滤当前页..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="pending">待审批</TabsTrigger>
          <TabsTrigger value="approved">已通过</TabsTrigger>
          <TabsTrigger value="rejected">已驳回</TabsTrigger>
          <TabsTrigger value="offline">已下架</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 批量操作栏 */}
      {bulkEnabled && bulkEligibleIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer"
              checked={allSelectedOnPage}
              onChange={toggleSelectAll}
              aria-label="全选"
            />
            <span className="text-sm">
              {selectedIds.size > 0
                ? `已选 ${selectedIds.size} / ${bulkEligibleIds.length} 项`
                : `全选当前页（${bulkEligibleIds.length} 项）`}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              {activeTab === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={bulkProcessing}
                    onClick={handleBulkApprove}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    批量通过
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={bulkProcessing}
                    onClick={() => openBulkDialog('reject')}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    批量驳回
                  </Button>
                </>
              )}
              {activeTab === 'approved' && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkProcessing}
                  onClick={() => openBulkDialog('offline')}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  批量下架
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={clearSelection}>
                取消选择
              </Button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayProducts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">暂无数据</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {total} 条记录，第 {page}/{totalPages || 1} 页
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 单个驳回 / 下架 对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isOfflineAction ? '驳回下架商品' : '驳回商品'}</DialogTitle>
            <DialogDescription>
              {isOfflineAction
                ? '该商品将被直接下架，创作者将收到下架原因通知'
                : '请填写驳回原因，创作者将收到通知'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>商品名称</Label>
              <p className="text-sm">{selectedProduct?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">{isOfflineAction ? '下架原因' : '驳回原因'} *</Label>
              <Textarea
                id="reason"
                placeholder={isOfflineAction ? '请详细说明下架原因...' : '请输入驳回原因...'}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {isOfflineAction ? '确认下架' : '确认驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量驳回 / 下架 对话框 */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'offline'
                ? `批量下架商品（${selectedIds.size} 项）`
                : `批量驳回商品（${selectedIds.size} 项）`}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'offline'
                ? '所选商品将被统一下架，相关创作者将收到下架原因通知'
                : '请填写统一的驳回原因，相关创作者将收到通知'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkReason">{bulkAction === 'offline' ? '下架原因' : '驳回原因'} *</Label>
              <Textarea
                id="bulkReason"
                placeholder={bulkAction === 'offline' ? '请详细说明下架原因...' : '请输入驳回原因...'}
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkProcessing}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleBulkConfirm} disabled={bulkProcessing}>
              {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkAction === 'offline' ? '确认批量下架' : '确认批量驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
