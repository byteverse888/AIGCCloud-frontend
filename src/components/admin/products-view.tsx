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
import {
  Check,
  X,
  Eye,
  Image as ImageIcon,
  Music,
  Video,
  Box,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CopyableCell } from '@/components/admin/copyable-cell';

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
  cover?: string;
  coverKey?: string;
  sales?: number;
  views?: number;
  likeCount?: number;
  favoriteCount?: number;
  commentCount?: number;
  reportCount?: number;
  offlineReason?: string;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
}

const categoryIcons: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Video,
  model: Box,
  music: Music,
  other: FileText,
};

const categoryLabels: Record<string, string> = {
  image: '图片',
  audio: '音频',
  video: '视频',
  model: '模型',
  music: '音乐',
  'digital-human': '数字人',
  comic: '漫画',
  other: '其他',
};

type BulkAction = 'approve' | 'reject' | 'offline';

interface ProductsViewProps {
  title?: string;
  subtitle?: string;
}

export function ProductsView({
  title = '商品管理',
  subtitle = '管理全平台的商品数据',
}: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [creatorIdInput, setCreatorIdInput] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const pageSize = 20;

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
        cover: (p.cover as string) || '',
        coverKey: (p.coverKey as string) || '',
        sales: (p.sales as number) || 0,
        views: (p.views as number) || 0,
        likeCount: (p.likeCount as number) || 0,
        favoriteCount: (p.favoriteCount as number) || 0,
        commentCount: (p.commentCount as number) || 0,
        reportCount: (p.reportCount as number) || 0,
        offlineReason: (p.offlineReason as string) || '',
        reviewNote: (p.reviewNote as string) || '',
        reviewedAt: (p.reviewedAt as string) || '',
        reviewedBy: (p.reviewedBy as string) || '',
        reviewerName: (p.reviewerName as string) || '',
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

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  // 按 Tab 计算本页可批量操作的商品 id
  // - all: 选中的 pending 可批量通过/驳回
  // - approved: approved 可批量下架
  // - reported: status !== offline 可批量下架
  // - offline: 不可批量
  const bulkEligibleIds = useMemo(() => {
    if (activeTab === 'all') {
      return products.filter((p) => p.status === 'pending' || p.status === 'approved').map((p) => p.objectId);
    }
    if (activeTab === 'approved') {
      return products.filter((p) => p.status === 'approved').map((p) => p.objectId);
    }
    if (activeTab === 'reported') {
      return products.filter((p) => p.status !== 'offline').map((p) => p.objectId);
    }
    if (activeTab === 'pending') {
      return products.filter((p) => p.status === 'pending').map((p) => p.objectId);
    }
    return [];
  }, [products, activeTab]);

  const bulkEnabled = activeTab !== 'offline';

  // 当前选中项按状态分组，用于批量按钮的可用性与目标范围
  const selectedPendingIds = useMemo(
    () => products.filter((p) => selectedIds.has(p.objectId) && p.status === 'pending').map((p) => p.objectId),
    [products, selectedIds]
  );
  const selectedOfflinableIds = useMemo(
    () =>
      products
        .filter((p) => selectedIds.has(p.objectId) && (p.status === 'approved' || p.status === 'pending'))
        .map((p) => p.objectId),
    [products, selectedIds]
  );
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
    if (allSelectedOnPage) setSelectedIds(new Set());
    else setSelectedIds(new Set(bulkEligibleIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleApprove = async (productId: string) => {
    try {
      await adminApi.reviewProduct({ product_id: productId, status: 'approved' });
      setProducts((prev) =>
        prev.map((p) => (p.objectId === productId ? { ...p, status: 'approved' } : p))
      );
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

  const openDetail = (product: Product) => {
    setDetailProduct(product);
    setDetailOpen(true);
  };

  const isOfflineAction =
    activeTab === 'reported' || selectedProduct?.status === 'approved';

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
        prev.map((p) =>
          p.objectId === selectedProduct.objectId ? { ...p, status: nextStatus } : p
        )
      );
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedProduct(null);
      toast.success(isOfflineAction ? '商品已驳回下架' : '商品已驳回');
    } catch {
      toast.error('操作失败');
    }
  };

  const handleBulkApprove = async () => {
    const ids = selectedPendingIds;
    if (ids.length === 0) {
      toast.error('选中项中没有待审核商品');
      return;
    }
    if (!confirm(`确定要批量通过 ${ids.length} 个待审核商品吗？`)) return;
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
    // 驳回仅针对 pending；下架针对 approved（被投诉 Tab 下包含 pending/approved）
    let ids: string[] = [];
    if (bulkAction === 'reject') {
      ids = selectedPendingIds;
    } else {
      // offline：针对 approved + pending（被投诉时允许跌 pending）
      ids = products
        .filter((p) => selectedIds.has(p.objectId) && (p.status === 'approved' || p.status === 'pending'))
        .map((p) => p.objectId);
    }
    if (ids.length === 0) {
      toast.error('选中项中没有可执行此操作的商品');
      return;
    }
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

  const formatDate = (s?: string) => (s ? new Date(s).toLocaleString('zh-CN') : '-');

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge variant="success">已通过</Badge>;
    if (status === 'pending') return <Badge>待审核</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">已驳回</Badge>;
    if (status === 'offline') return <Badge variant="destructive">已下架</Badge>;
    if (status === 'draft') return <Badge variant="secondary">草稿</Badge>;
    return <Badge variant="destructive">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">
          {subtitle} · 共 {total} 条
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
              <div className="relative w-52">
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
              <div className="relative w-52">
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
                <div className="flex gap-2 flex-wrap">
                  {/* 通过：选中项包含 pending 即可显示（全部 / 待审核 Tab）*/}
                  {(activeTab === 'pending' || activeTab === 'all') && selectedPendingIds.length > 0 && (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={bulkProcessing}
                      onClick={handleBulkApprove}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      批量通过（{selectedPendingIds.length}）
                    </Button>
                  )}
                  {/* 驳回：针对 pending，在全部 / 待审核 Tab 显示 */}
                  {(activeTab === 'pending' || activeTab === 'all') && selectedPendingIds.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={bulkProcessing}
                      onClick={() => openBulkDialog('reject')}
                    >
                      <X className="mr-1 h-4 w-4" />
                      批量驳回（{selectedPendingIds.length}）
                    </Button>
                  )}
                  {/* 下架：针对 approved（+ 被投诉 Tab 下的 pending）*/}
                  {(activeTab === 'approved' || activeTab === 'all' || activeTab === 'reported') &&
                    selectedOfflinableIds.length > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={bulkProcessing}
                        onClick={() => openBulkDialog('offline')}
                      >
                        <X className="mr-1 h-4 w-4" />
                        批量下架（{selectedOfflinableIds.length}）
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">暂无数据</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {bulkEnabled && (
                      <th className="px-3 py-3 w-[40px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer"
                          checked={allSelectedOnPage}
                          onChange={toggleSelectAll}
                          aria-label="全选"
                        />
                      </th>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[70px]">封面</th>
                    <th className="px-3 py-3 text-left text-xs font-medium w-[200px]">名称</th>
                    <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[80px]">分类</th>
                    <th className="px-3 py-3 text-left text-xs font-medium w-[150px]">创作者</th>
                    <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[80px]">价格</th>
                    <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">状态</th>
                    <th className="px-3 py-3 text-right text-xs font-medium whitespace-nowrap w-[70px]">销量</th>
                    <th className="px-3 py-3 text-right text-xs font-medium whitespace-nowrap w-[70px]">投诉</th>
                    <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[150px]">审核人/时间</th>
                    <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[150px]">创建时间</th>
                    <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[220px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const CategoryIcon = categoryIcons[product.category] || FileText;
                    const isEligible = bulkEnabled && bulkEligibleIds.includes(product.objectId);
                    const checked = selectedIds.has(product.objectId);
                    return (
                      <tr key={product.objectId} className="border-b hover:bg-muted/30 align-middle">
                        {bulkEnabled && (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer"
                              checked={checked}
                              disabled={!isEligible}
                              onChange={() => toggleSelect(product.objectId)}
                              aria-label="选择"
                            />
                          </td>
                        )}
                        <td className="px-3 py-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-muted overflow-hidden">
                            {product.cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.cover}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <CategoryIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline truncate max-w-[180px] text-left block"
                            title={product.name}
                            onClick={() => openDetail(product)}
                          >
                            {product.name || '-'}
                          </button>
                          {product.description && (
                            <div
                              className="text-xs text-muted-foreground truncate max-w-[180px]"
                              title={product.description}
                            >
                              {product.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {categoryLabels[product.category] || product.category}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="flex flex-col gap-0.5">
                            <CopyableCell
                              value={product.creatorName || '-'}
                              maxWidth="max-w-[140px]"
                            />
                            <span
                              className="text-[11px] text-muted-foreground truncate max-w-[140px]"
                              title={product.creatorId}
                            >
                              {product.creatorId || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap font-medium">
                          ¥{product.price}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {statusBadge(product.status)}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-right">
                          {product.sales ?? 0}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-right">
                          {(product.reportCount ?? 0) > 0 ? (
                            <span className="text-destructive font-medium">
                              {product.reportCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {product.reviewedAt ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-foreground" title={product.reviewedBy}>
                                {product.reviewerName || product.reviewedBy || '-'}
                              </span>
                              <span>{formatDate(product.reviewedAt)}</span>
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                          {formatDate(product.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetail(product)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              详情
                            </Button>
                            {activeTab === 'reported' ? (
                              product.status !== 'offline' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openRejectDialog(product)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  下架
                                </Button>
                              )
                            ) : product.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(product.objectId)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  通过
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openRejectDialog(product)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  驳回
                                </Button>
                              </>
                            ) : product.status === 'approved' ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRejectDialog(product)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                下架
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && products.length > 0 && (
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

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{detailProduct.name || '商品详情'}</DialogTitle>
                <DialogDescription>
                  创建于 {formatDate(detailProduct.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {detailProduct.cover && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detailProduct.cover}
                      alt={detailProduct.name}
                      className="max-h-64 rounded-md object-cover"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">商品ID</Label>
                    <p className="mt-1 font-mono text-xs break-all">{detailProduct.objectId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">状态</Label>
                    <div className="mt-1">{statusBadge(detailProduct.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">分类</Label>
                    <p className="mt-1">
                      {categoryLabels[detailProduct.category] || detailProduct.category}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">价格</Label>
                    <p className="mt-1 font-medium">¥{detailProduct.price}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">创作者</Label>
                    <p className="mt-1">
                      {detailProduct.creatorName || '-'}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({detailProduct.creatorId || '-'})
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">销量 / 浏览</Label>
                    <p className="mt-1">
                      {detailProduct.sales ?? 0} / {detailProduct.views ?? 0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">点赞 / 收藏 / 评论</Label>
                    <p className="mt-1">
                      {detailProduct.likeCount ?? 0} / {detailProduct.favoriteCount ?? 0} /{' '}
                      {detailProduct.commentCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">投诉数</Label>
                    <p className="mt-1">
                      {(detailProduct.reportCount ?? 0) > 0 ? (
                        <span className="text-destructive font-medium">
                          {detailProduct.reportCount}
                        </span>
                      ) : (
                        '0'
                      )}
                    </p>
                  </div>
                </div>
                {detailProduct.description && (
                  <div>
                    <Label>商品描述</Label>
                    <p className="mt-1 text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap break-all">
                      {detailProduct.description}
                    </p>
                  </div>
                )}
                {detailProduct.reviewedAt && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <Label>审核信息</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">审核人：</span>
                        <span className="font-medium">
                          {detailProduct.reviewerName || detailProduct.reviewedBy || '-'}
                        </span>
                        {detailProduct.reviewerName && detailProduct.reviewedBy && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({detailProduct.reviewedBy})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">审核时间：</span>
                        <span>{formatDate(detailProduct.reviewedAt)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {detailProduct.reviewNote && (
                  <div>
                    <Label>审核备注</Label>
                    <p className="mt-1 text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap break-all">
                      {detailProduct.reviewNote}
                    </p>
                  </div>
                )}
                {detailProduct.offlineReason && detailProduct.status === 'offline' && (
                  <div>
                    <Label className="text-destructive">下架原因</Label>
                    <p className="mt-1 text-sm text-destructive bg-destructive/10 p-3 rounded-lg whitespace-pre-wrap break-all">
                      {detailProduct.offlineReason}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="bulkReason">
                {bulkAction === 'offline' ? '下架原因' : '驳回原因'} *
              </Label>
              <Textarea
                id="bulkReason"
                placeholder={bulkAction === 'offline' ? '请详细说明下架原因...' : '请输入驳回原因...'}
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={bulkProcessing}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkConfirm}
              disabled={bulkProcessing}
            >
              {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkAction === 'offline' ? '确认批量下架' : '确认批量驳回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
