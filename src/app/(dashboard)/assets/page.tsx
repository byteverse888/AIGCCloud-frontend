'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Package,
  Plus,
  Search,
  Upload,
  Grid,
  List,
  Image,
  Music,
  Video,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ShoppingBag,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store';
import { getUserAIIPAssets, updateAIIPAssetStatus, deleteAIIPAsset, initUserAIIPAssets, clearUserAIIPAssets, updateObject, type AIIPAsset } from '@/lib/parse-actions';
import { assetsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  offline: 'default',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已上架',
  rejected: '已拒绝',
  offline: '已下架',
};

const typeIcons: Record<string, typeof Image> = {
  image: Image,
  audio: Music,
  video: Video,
};

export default function AssetsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [products, setProducts] = useState<AIIPAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [previewAsset, setPreviewAsset] = useState<AIIPAsset | null>(null);
  const [editAsset, setEditAsset] = useState<AIIPAsset | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: '', 
    price: 0, 
    category: 'image',
    copyright: '',
    license: 'CC-BY-NC-ND',
  });
  const { user } = useAuthStore();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    const ownerKey = user.web3Address || user.objectId;
    setLoading(true);
    const result = await getUserAIIPAssets(ownerKey, {
      category: typeFilter,
      status: statusFilter,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setProducts(result.data);
      setTotal(result.total);
    } else {
      toast.error(result.error || '加载失败');
    }
    setLoading(false);
  }, [user, typeFilter, statusFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (assetId: string) => {
    if (!confirm('确定要删除这个资产吗？')) return;
    const ownerKey = user?.web3Address || user?.objectId || '';
    const result = await deleteAIIPAsset(assetId, ownerKey);
    if (result.success) {
      toast.success('删除成功');
      fetchProducts();
    } else {
      toast.error(result.error || '删除失败');
    }
  };

  const handleToggleStatus = async (asset: AIIPAsset) => {
    // 上架流程：draft/offline/rejected -> pending(提交审核)；approved -> offline(下架)
    let newStatus: AIIPAsset['status'];
    if (asset.status === 'approved') {
      newStatus = 'offline';
    } else {
      newStatus = 'pending'; // 提交审核
    }
    const result = await updateAIIPAssetStatus(asset.objectId, newStatus);
    if (result.success) {
      toast.success(newStatus === 'pending' ? '已提交审核' : '下架成功');
      fetchProducts();
    } else {
      toast.error(result.error || '操作失败');
    }
  };

  const handleEdit = (asset: AIIPAsset) => {
    setEditForm({ 
      name: asset.name, 
      description: asset.description || '', 
      price: asset.price || 0, 
      category: asset.category,
      copyright: asset.copyright || '',
      license: asset.license || 'CC-BY-NC-ND',
    });
    setEditAsset(asset);
  };

  const handleSaveEdit = async () => {
    if (!editAsset) return;
    
    // 先尝试用新API编辑Product
    if (editAsset.status !== 'draft') {
      // 草稿才能用新API
      const result = await assetsApi.updateAsset(editAsset.objectId, {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        coverKey: editAsset.cover,
        copyright: editForm.copyright,
        license: editForm.license,
        tags: [],
      });
      if (result.success) {
        toast.success('保存成功');
        setEditAsset(null);
        fetchProducts();
        return;
      }
    }
    
    // 否则用Parse更新AIIPAsset
    const result = await updateObject('AIIPAsset', editAsset.objectId, editForm);
    if (result.success) {
      toast.success('保存成功');
      setEditAsset(null);
      fetchProducts();
    } else {
      toast.error(result.error || '保存失败');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleClearMock = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (!confirm('确定要清空您的AIIP模拟数据吗？')) return;
    const result = await clearUserAIIPAssets(user.web3Address || user.objectId);
    if (result.success) {
      toast.success(result.message || '清空成功');
      setPage(1);
      fetchProducts();
    } else {
      toast.error(result.error || '清空失败');
    }
  };

  const handleCreateMock = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    const result = await initUserAIIPAssets(user.objectId, user.web3Address || user.objectId, user.username || '用户');
    if (result.success) {
      toast.success(result.message || '创建成功');
      fetchProducts();
    } else {
      toast.error(result.error || '创建失败');
    }
  };

  const stats = {
    total,
    approved: products.filter((p) => p.status === 'approved').length,
    pending: products.filter((p) => p.status === 'pending').length,
    totalViews: products.reduce((sum, p) => sum + (p.views || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AIIP资产</h1>
          <p className="text-muted-foreground">管理您的AI创作资产，上架到商城销售</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClearMock}><Trash2 className="mr-2 h-4 w-4" />清空模拟数据</Button>
          <Button variant="outline" size="sm" onClick={handleCreateMock}><RefreshCw className="mr-2 h-4 w-4" />创建模拟数据</Button>
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" />批量上传</Button>
          <Button><Plus className="mr-2 h-4 w-4" />上传资产</Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">全部资产</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已上架</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.approved}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待审核</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总浏览量</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索资产..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="image">图片</SelectItem>
              <SelectItem value="audio">音频</SelectItem>
              <SelectItem value="video">视频</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已上架</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-md border">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}><Grid className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* 资产列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !user ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><p>请先登录</p></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Package className="h-16 w-16 mb-4" /><p>暂无资产</p></div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const TypeIcon = typeIcons[product.category] || Image;
            return (
              <Card key={product.objectId} className="overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {product.cover ? (<img src={product.cover} alt={product.name} className="h-full w-full object-cover" />) : (<div className="flex h-full items-center justify-center"><TypeIcon className="h-16 w-16 text-muted-foreground/50" /></div>)}
                  <div className="absolute right-2 top-2"><Badge variant={statusColors[product.status] || 'default'}>{statusLabels[product.status] || product.status}</Badge></div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="secondary" size="icon" className="absolute bottom-2 right-2"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setPreviewAsset(product)}><Eye className="mr-2 h-4 w-4" />预览</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(product)}><ShoppingBag className="mr-2 h-4 w-4" />{product.status === 'approved' ? '下架' : '提交审核'}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(product)}><Edit className="mr-2 h-4 w-4" />编辑</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.objectId)}><Trash2 className="mr-2 h-4 w-4" />删除</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardContent className="p-4">
                  <h3 className="truncate font-medium">{product.name}</h3>
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>¥{product.price}</span>
                    <span>{product.views || 0} 浏览</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-medium">资产名称</th>
                  <th className="p-4 text-left font-medium">类型</th>
                  <th className="p-4 text-left font-medium">状态</th>
                  <th className="p-4 text-left font-medium">价格</th>
                  <th className="p-4 text-left font-medium">浏览量</th>
                  <th className="p-4 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const TypeIcon = typeIcons[product.category] || Image;
                  return (
                    <tr key={product.objectId} className="border-b last:border-0">
                      <td className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded bg-muted"><TypeIcon className="h-5 w-5 text-muted-foreground" /></div><span className="font-medium">{product.name}</span></div></td>
                      <td className="p-4">{product.category}</td>
                      <td className="p-4"><Badge variant={statusColors[product.status] || 'default'}>{statusLabels[product.status] || product.status}</Badge></td>
                      <td className="p-4">¥{product.price}</td>
                      <td className="p-4">{product.views || 0}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(product)}><ShoppingBag className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.objectId)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}>
            <ChevronLeft className="h-4 w-4 mr-1" />上一页
          </Button>
          <span className="text-sm text-muted-foreground px-4">第 {page} 页 / 共 {totalPages} 页 (共 {total} 条)</span>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}>
            下一页<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-sm text-muted-foreground">跳转</span>
            <Input type="number" min={1} max={totalPages} className="w-16 h-8" onKeyDown={(e) => { if (e.key === 'Enter') handlePageChange(parseInt((e.target as HTMLInputElement).value) || 1); }} />
            <span className="text-sm text-muted-foreground">页</span>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{previewAsset?.name}</DialogTitle></DialogHeader>
          {previewAsset && (
            <div className="space-y-4">
              {previewAsset.cover && <img src={previewAsset.cover} alt={previewAsset.name} className="w-full rounded-lg" />}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>类型：{previewAsset.category}</div>
                <div>价格：¥{previewAsset.price}</div>
                <div>状态：<Badge variant={statusColors[previewAsset.status] || 'default'}>{statusLabels[previewAsset.status]}</Badge></div>
                <div>浏览量：{previewAsset.views || 0}</div>
              </div>
              {previewAsset.description && <p className="text-sm text-muted-foreground">{previewAsset.description}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={!!editAsset} onOpenChange={() => setEditAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>编辑资产</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">图片</SelectItem>
                  <SelectItem value="audio">音频</SelectItem>
                  <SelectItem value="video">视频</SelectItem>
                  <SelectItem value="model">模型</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>价格 (元)</Label>
              <Input type="number" value={editForm.price} onChange={(e) => setEditForm(f => ({ ...f, price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>版权地址 (Web3)</Label>
              <Input value={editForm.copyright} onChange={(e) => setEditForm(f => ({ ...f, copyright: e.target.value }))} placeholder="0x..." />
            </div>
            <div className="space-y-2">
              <Label>许可证</Label>
              <Select value={editForm.license} onValueChange={(v) => setEditForm(f => ({ ...f, license: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC-BY">CC BY (署名)</SelectItem>
                  <SelectItem value="CC-BY-NC">CC BY-NC (非商业)</SelectItem>
                  <SelectItem value="CC-BY-ND">CC BY-ND (禁止改作)</SelectItem>
                  <SelectItem value="CC-BY-NC-ND">CC BY-NC-ND (非商业禁止改作)</SelectItem>
                  <SelectItem value="CC-BY-SA">CC BY-SA (相同方式共享)</SelectItem>
                  <SelectItem value="ALL-RIGHTS">版权所有</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditAsset(null)}>取消</Button>
              <Button onClick={handleSaveEdit}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
