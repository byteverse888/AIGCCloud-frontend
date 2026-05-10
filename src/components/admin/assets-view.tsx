'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Check,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CopyableCell } from '@/components/admin/copyable-cell';

interface AssetRow {
  id: string;
  objectId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  status: string;
  cover: string;
  assetUrl: string;
  ownerId: string;
  ownerName: string;
  isListed: boolean;
  listedProductId: string;
  views: number;
  createdAt: string;
  updatedAt?: string;
  reviewNote?: string;
  offlineReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
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

interface AssetsViewProps {
  title?: string;
  subtitle?: string;
}

export function AssetsView({ title = 'AI 资产管理', subtitle = '审核和管理平台 AI 资产' }: AssetsViewProps) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerIdInput, setOwnerIdInput] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 20;

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        limit: number;
        status?: string;
        category?: string;
        keyword?: string;
        ownerId?: string;
      } = { page, limit: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (keyword.trim()) params.keyword = keyword.trim();
      if (ownerId.trim()) params.ownerId = ownerId.trim();
      const res = await adminApi.listAdminAssets(params);
      setAssets(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      toast.error('加载 AI 资产列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, keyword, ownerId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, keyword, ownerId]);

  const handleSearch = () => setKeyword(keywordInput);
  const handleOwnerIdSearch = () => setOwnerId(ownerIdInput.trim());

  const handleApprove = async (asset: AssetRow) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await adminApi.reviewAsset({ asset_id: asset.objectId, status: 'approved' });
      toast.success('资产已通过审核');
      fetchAssets();
    } catch {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openReject = (asset: AssetRow) => {
    setSelected(asset);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.reviewAsset({
        asset_id: selected.objectId,
        status: 'rejected',
        review_note: rejectReason,
      });
      toast.success('资产已驳回');
      setRejectOpen(false);
      setSelected(null);
      fetchAssets();
    } catch {
      toast.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (asset: AssetRow) => {
    setSelected(asset);
    setDetailOpen(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>资产列表</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索资产名称..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="pl-10"
                />
              </div>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="按所有者 userID 或 用户名 搜索..."
                  value={ownerIdInput}
                  onChange={(e) => setOwnerIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleOwnerIdSearch();
                  }}
                  className="pl-10"
                />
              </div>
              {ownerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOwnerIdInput('');
                    setOwnerId('');
                  }}
                >
                  清除用户
                </Button>
              )}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  <SelectItem value="image">图片</SelectItem>
                  <SelectItem value="audio">音频</SelectItem>
                  <SelectItem value="video">视频</SelectItem>
                  <SelectItem value="model">模型</SelectItem>
                  <SelectItem value="music">音乐</SelectItem>
                  <SelectItem value="digital-human">数字人</SelectItem>
                  <SelectItem value="comic">漫画</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchAssets} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">暂无 AI 资产数据</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[160px]">资产ID</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[200px]">名称</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">分类</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[130px]">所有者</th>
                      <th className="px-3 py-3 text-right text-xs font-medium whitespace-nowrap w-[90px]">价格</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">状态</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[150px]">创建时间</th>
                      <th className="px-3 py-3 text-right text-xs font-medium whitespace-nowrap w-[220px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.objectId} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={asset.objectId} mono maxWidth="max-w-[140px]" />
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={asset.name} maxWidth="max-w-[180px]" />
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {categoryLabels[asset.category] || asset.category || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="flex flex-col gap-0.5">
                            <CopyableCell
                              value={asset.ownerName || '-'}
                              maxWidth="max-w-[110px]"
                            />
                            <span
                              className="text-[11px] text-muted-foreground truncate max-w-[110px]"
                              title={asset.ownerId}
                            >
                              {asset.ownerId || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-right font-bold whitespace-nowrap">
                          {asset.price > 0 ? `¥${asset.price}` : '免费'}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <Badge variant={statusColors[asset.status] || 'default'}>
                            {statusLabels[asset.status] || asset.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                          {asset.createdAt ? new Date(asset.createdAt).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openDetail(asset)}>
                              <Eye className="mr-1 h-4 w-4" />
                              详情
                            </Button>
                            {asset.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={submitting}
                                  onClick={() => handleApprove(asset)}
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  通过
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={submitting}
                                  onClick={() => openReject(asset)}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  驳回
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>资产详情</DialogTitle>
            <DialogDescription>查看 AI 资产详细信息</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 py-2 text-sm">
              {selected.cover && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.cover}
                    alt={selected.name}
                    className="max-h-48 rounded-md border object-contain"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">资产ID</Label>
                  <p className="font-mono text-xs mt-1 break-all">{selected.objectId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">分类</Label>
                  <p className="mt-1">{categoryLabels[selected.category] || selected.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">名称</Label>
                  <p className="mt-1 break-all">{selected.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">价格</Label>
                  <p className="mt-1">{selected.price > 0 ? `¥${selected.price}` : '免费'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">所有者</Label>
                  <p className="mt-1 break-all">{selected.ownerName || selected.ownerId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <p className="mt-1">
                    <Badge variant={statusColors[selected.status] || 'default'}>
                      {statusLabels[selected.status] || selected.status}
                    </Badge>
                  </p>
                </div>
              </div>
              {selected.description && (
                <div>
                  <Label className="text-muted-foreground">描述</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}
              {(selected.status === 'rejected' || selected.status === 'offline') && (selected.reviewNote || selected.offlineReason) && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <Label className="text-destructive">
                    {selected.status === 'offline' ? '下架原因' : '驳回原因'}
                  </Label>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-destructive">
                    {selected.offlineReason || selected.reviewNote}
                  </p>
                  {selected.reviewedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      审核时间：{new Date(selected.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {selected.assetUrl && (
                <div>
                  <Label className="text-muted-foreground">资源地址</Label>
                  <a
                    href={selected.assetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-primary text-xs break-all hover:underline"
                  >
                    {selected.assetUrl}
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              关闭
            </Button>
            {selected?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => {
                    setDetailOpen(false);
                    if (selected) openReject(selected);
                  }}
                >
                  驳回
                </Button>
                <Button
                  disabled={submitting}
                  onClick={async () => {
                    if (selected) {
                      await handleApprove(selected);
                      setDetailOpen(false);
                    }
                  }}
                >
                  通过
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回对话框 */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回资产</DialogTitle>
            <DialogDescription>请填写驳回原因，所有者将收到通知</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>资产名称</Label>
              <p className="text-sm break-all">{selected?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">驳回原因 *</Label>
              <Textarea
                id="reason"
                placeholder="请输入驳回原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" disabled={submitting} onClick={handleReject}>
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
