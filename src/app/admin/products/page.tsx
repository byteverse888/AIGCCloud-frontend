'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Check, X, Eye, Image, Music, Video, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Product {
  objectId: string;
  name: string;
  category: string;
  creatorId: string;
  creatorName?: string;
  price: number;
  status: string;
  createdAt: string;
  description?: string;
  reportCount?: number;
  offlineReason?: string;
}

const categoryIcons: Record<string, typeof Image> = {
  image: Image,
  audio: Music,
  video: Video,
};

type BulkAction = 'approve' | 'reject' | 'offline';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [creatorIdInput, setCreatorIdInput] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
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
      const result = await adminApi.getPendingProducts({
        page,
        limit: pageSize,
        status: activeTab,
        creatorId: creatorId.trim() || undefined,
        keyword: keyword.trim() || undefined,
      });
      const items = (result.data || []).map((p: Record<string, unknown>) => ({
        objectId: p.objectId as string,
        name: (p.name as string) || '',
        category: (p.category as string) || 'other',
        creatorId: (p.creatorId as string) || '',
        creatorName: (p.creatorName as string) || '',
        price: (p.price as number) || 0,
        status: (p.status as string) || 'pending',
        createdAt: (p.createdAt as string) || '',
        description: (p.description as string) || '',
        reportCount: (p.reportCount as number) || 0,
        offlineReason: (p.offlineReason as string) || '',
      }));
      setProducts(items);
      setTotal(result.total);
    } catch {
      toast.error('加载商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, creatorId, keyword]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 切换 Tab / 翻页时回到第一页并清空选中
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  // 当前页可批量操作的商品（按 Tab 状态区分）
  const bulkEligibleIds = useMemo(() => {
    const eligibleStatuses =
      activeTab === 'pending'
        ? ['pending']
        : activeTab === 'approved'
        ? ['approved']
        : [];
    return products.filter((p) => eligibleStatuses.includes(p.status)).map((p) => p.objectId);
  }, [products, activeTab]);

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
      setProducts((prev) => prev.map((p) => (p.objectId === productId ? { ...p, status: 'approved' } : p)));
      toast.success('商品已通过审核');
    } catch {
      toast.error('操作失败');
    }
  };

  const openRejectDialog = (product: Product) => {
    setSelectedProduct(product);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const isOfflineAction = activeTab === 'reported' || selectedProduct?.status === 'approved';

  const handleReject = async () => {
    if (!selectedProduct || !rejectReason.trim()) {
      toast.error(isOfflineAction ? '请填写下架原因' : '请填写驳回原因');
      return;
    }
    const nextStatus = isOfflineAction ? 'offline' : 'rejected';
    try {
      await adminApi.reviewProduct({
        product_id: selectedProduct.objectId,
        status: nextStatus,
        review_note: rejectReason,
      });
      setProducts((prev) =>
        prev.map((p) => (p.objectId === selectedProduct.objectId ? { ...p, status: nextStatus } : p))
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

  // 打开批量驳回/下架对话框
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

  const filteredProducts = products;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">商品管理</h1>
        <p className="text-muted-foreground">
          共 {total} 条{' '}
          {activeTab === 'all'
            ? '全部'
            : activeTab === 'approved'
            ? '已通过'
            : activeTab === 'reported'
            ? '被投诉'
            : activeTab === 'offline'
            ? '已下架'
            : ''}
          数据
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="approved">已通过</TabsTrigger>
                <TabsTrigger value="reported">被投诉</TabsTrigger>
                <TabsTrigger value="offline">已下架</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="按商品名称搜索..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      setKeyword(keywordInput.trim());
                    }
                  }}
                  className="pl-9"
                />
              </div>
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
                  setKeyword(keywordInput.trim());
                  setCreatorId(creatorIdInput.trim());
                }}
              >
                搜索
              </Button>
              {(creatorId || keyword) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCreatorIdInput('');
                    setCreatorId('');
                    setKeywordInput('');
                    setKeyword('');
                    setPage(1);
                  }}
                >
                  清除
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 批量操作栏 */}
          {bulkEnabled && bulkEligibleIds.length > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 p-3">
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
                        <Check className="mr-1 h-4 w-4" />
                        批量通过
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={bulkProcessing}
                        onClick={() => openBulkDialog('reject')}
                      >
                        <X className="mr-1 h-4 w-4" />
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
                      <X className="mr-1 h-4 w-4" />
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

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">暂无数据</div>
            ) : (
              filteredProducts.map((product) => {
                const CategoryIcon = categoryIcons[product.category] || Image;
                const isEligible = bulkEnabled && bulkEligibleIds.includes(product.objectId);
                const checked = selectedIds.has(product.objectId);
                return (
                  <div key={product.objectId} className="flex items-center gap-4 rounded-lg border p-4">
                    {bulkEnabled && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={checked}
                        disabled={!isEligible}
                        onChange={() => toggleSelect(product.objectId)}
                        aria-label="选择"
                      />
                    )}
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                      <CategoryIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        创作者: {product.creatorName || '-'} <span className="text-xs">({product.creatorId || '-'})</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ¥{product.price} | {new Date(product.createdAt).toLocaleDateString()}
                        {(product.reportCount ?? 0) > 0 && (
                          <span className="ml-2 text-destructive">· 投诉 {product.reportCount} 次</span>
                        )}
                      </p>
                      {product.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                      )}
                      {product.offlineReason && product.status === 'offline' && (
                        <p className="mt-1 text-xs text-destructive line-clamp-1">下架原因：{product.offlineReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeTab === 'reported' ? (
                        <>
                          {product.status === 'offline' ? (
                            <Badge variant="destructive">已下架</Badge>
                          ) : product.status === 'approved' ? (
                            <Badge variant="success">已通过</Badge>
                          ) : product.status === 'pending' ? (
                            <Badge>待审核</Badge>
                          ) : (
                            <Badge variant="destructive">{product.status}</Badge>
                          )}
                          {product.status !== 'offline' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(product)}
                            >
                              <X className="mr-1 h-4 w-4" />
                              下架
                            </Button>
                          )}
                        </>
                      ) : product.status === 'pending' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setSelectedProduct(product)}>
                            <Eye className="mr-1 h-4 w-4" />
                            详情
                          </Button>
                          <Button size="sm" variant="default" onClick={() => handleApprove(product.objectId)}>
                            <Check className="mr-1 h-4 w-4" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(product)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            驳回
                          </Button>
                        </>
                      ) : product.status === 'approved' ? (
                        <>
                          <Badge variant="success">已通过</Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(product)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            驳回下架
                          </Button>
                        </>
                      ) : product.status === 'offline' ? (
                        <Badge variant="destructive">已下架</Badge>
                      ) : (
                        <Badge variant="destructive">已驳回</Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && filteredProducts.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
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
        </CardContent>
      </Card>

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
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>取消</Button>
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
              {bulkAction === 'offline' ? `批量下架商品（${selectedIds.size} 项）` : `批量驳回商品（${selectedIds.size} 项）`}
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
