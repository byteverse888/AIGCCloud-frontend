'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  ShoppingCart,
  Bookmark,
  ThumbsUp,
  Share2,
  Image,
  Music,
  Music2,
  Video,
  Mic,
  Bot,
  BookImage,
  SlidersHorizontal,
  Loader2,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCartStore, useAuthStore, useWalletStore } from '@/store';
import { 
  getProducts, 
  toggleFavorite, 
  toggleLike, 
  createPendingOrder,
  verifyTransferAndCompleteOrder,
  checkUserLikesAndFavorites, 
  initMarketMockProducts, 
  clearMarketMockProducts,
  getProductComments,
  createComment,
  type Product,
  type Comment,
} from '@/lib/parse-actions';
import toast from 'react-hot-toast';
import { cn, copyText } from '@/lib/utils';
import { mockTransfer, transferWithMetaMask, transferWithPrivateKey, hasExternalWallet } from '@/lib/web3-client';
import { ProductDetailDialog } from '@/components/product-detail-dialog';

const PAGE_SIZE = 20;

const categories = [
  { value: 'all', label: '全部', icon: null },
  { value: 'image', label: '图片', icon: Image },
  { value: 'audio', label: '音频', icon: Mic },
  { value: 'video', label: '视频', icon: Video },
  { value: 'comic', label: '图文漫画', icon: BookImage },
  { value: 'music', label: '音乐', icon: Music2 },
  { value: 'digital-human', label: '数字人', icon: Bot },
];

const sortOptions = [
  { value: 'sales', label: '销量优先' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
  { value: 'rating', label: '评分最高' },
  { value: 'newest', label: '最新上架' },
];

const categoryIcons: Record<string, typeof Image> = {
  image: Image,
  audio: Mic,
  video: Video,
  comic: BookImage,
  music: Music2,
  'digital-human': Bot,
};

export default function MarketPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('sales');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  // 支付弹窗状态
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; orderNo: string; sellerAddress: string; amount: number; productName: string } | null>(null);
  const [txHashInput, setTxHashInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState(''); // 私钥输入
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { privateKey: storedPrivateKey, walletType } = useWalletStore(); // 从内存获取私钥

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const result = await getProducts({
      category,
      search: searchQuery || undefined,
      sortBy,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setProducts(result.data);
      setTotal(result.total);
      if (user?.objectId && result.data.length > 0) {
        const productIds = result.data.map((p: Product) => p.objectId);
        const statusResult = await checkUserLikesAndFavorites(productIds, user.objectId);
        if (statusResult.success) {
          setLikedIds(statusResult.likedIds);
          setFavoritedIds(statusResult.favoritedIds);
        }
      }
    } else {
      toast.error(result.error || '加载失败');
    }
    setLoading(false);
  }, [category, searchQuery, sortBy, page, user?.objectId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = async (product: Product) => {
    if (!user?.objectId) {
      toast.error('请先登录');
      return;
    }
    try {
      await addItem({
        productId: product.objectId,
        name: product.name,
        price: product.price,
      });
      toast.success('已加入购物车');
    } catch (e: any) {
      toast.error(e?.message || '加入购物车失败');
    }
  };

  const handlePurchase = async (product: Product) => {
    if (!user?.web3Address) {
      toast.error('请先登录Web3账户');
      return;
    }
    // 比较地址时统一转为小写，避免大小写导致的问题
    if (product.owner?.toLowerCase() === user.web3Address.toLowerCase()) {
      toast.error('不能购买自己的商品');
      return;
    }
    if (!confirm(`确定要购买「${product.name}」吗？\n价格: ¥${product.price}\n支付方式: Web3转账`)) {
      return;
    }
    const orderResult = await createPendingOrder(user.objectId, user.web3Address, product);
    if (!orderResult.success) {
      toast.error(orderResult.error || '创建订单失败');
      return;
    }
    toast.success(`订单已创建，请向卖家地址转账 ¥${product.price}`);
    toast(`卖家地址: ${orderResult.sellerAddress?.slice(0, 10)}...`, { duration: 5000 });
    // 打开支付弹窗
    setPendingOrder({
      orderId: orderResult.orderId!,
      orderNo: orderResult.orderNo!,
      sellerAddress: orderResult.sellerAddress!,
      amount: orderResult.amount!,
      productName: product.name,
    });
    setTxHashInput('');
    setPaymentDialogOpen(true);
  };

  const handleVerifyPayment = async () => {
    if (!pendingOrder) return;
    
    // 如果已经有 txHash，直接验证
    if (txHashInput.trim()) {
      setVerifying(true);
      try {
        const result = await verifyTransferAndCompleteOrder(pendingOrder.orderId, txHashInput.trim());
        if (result.success) {
          toast.success('购买成功！商品已转移到您的AIIP资产');
          setPaymentDialogOpen(false);
          setPendingOrder(null);
          fetchProducts();
          // 同步刷新右上角购物车角标（后端已移除该商品）
          void useCartStore.getState().fetchCart();
        } else {
          toast.error(result.error || '验证失败');
        }
      } catch {
        toast.error('验证失败');
      } finally {
        setVerifying(false);
      }
      return;
    }
    
    toast.error('请输入交易Hash');
  };

  // 确认支付（进行转账）
  const handleConfirmPayment = async () => {
    if (!pendingOrder) return;
    
    setVerifying(true);
    try {
      // 进行转账，优先级：MetaMask > 内存私钥 > 输入私钥 > 模拟
      let transferResult;
      
      // 确定使用的私钥（优先使用内存中的，其次是用户输入的）
      const effectivePrivateKey = storedPrivateKey || privateKeyInput.trim();
      
      if (hasExternalWallet()) {
        // 优先使用 MetaMask 转账
        toast.loading('请在钱包中确认转账...', { id: 'transfer' });
        transferResult = await transferWithMetaMask(pendingOrder.sellerAddress, pendingOrder.amount);
      } else if (effectivePrivateKey) {
        // 使用私钥进行真实转账
        const source = storedPrivateKey ? '登录私钥' : '输入私钥';
        toast.loading(`正在使用${source}进行链上转账...`, { id: 'transfer' });
        transferResult = await transferWithPrivateKey(
          effectivePrivateKey,
          pendingOrder.sellerAddress,
          pendingOrder.amount
        );
      } else {
        // 无钱包且无私钥，开发环境使用模拟转账
        toast.loading('正在处理转账（模拟）...', { id: 'transfer' });
        transferResult = await mockTransfer(pendingOrder.sellerAddress, pendingOrder.amount);
      }
      
      toast.dismiss('transfer');
      
      if (!transferResult.success) {
        toast.error(transferResult.error || '转账失败');
        return;
      }
      
      const txHash = transferResult.txHash!;
      setTxHashInput(txHash);
      toast.success(`转账成功！txHash: ${txHash.slice(0, 10)}...`);
      
      // 调用验证接口
      toast.loading('正在验证订单...', { id: 'verify' });
      const verifyResult = await verifyTransferAndCompleteOrder(pendingOrder.orderId, txHash);
      toast.dismiss('verify');
      
      if (verifyResult.success) {
        toast.success('购买成功！商品已转移到您的AIIP资产');
        setPaymentDialogOpen(false);
        setPendingOrder(null);
        setPrivateKeyInput(''); // 清空输入的私钥
        fetchProducts();
        // 同步刷新右上角购物车角标（后端已移除该商品）
        void useCartStore.getState().fetchCart();
      } else {
        toast.error(verifyResult.error || '订单验证失败，请手动验证');
      }
    } catch (err) {
      toast.dismiss('transfer');
      toast.dismiss('verify');
      toast.error('操作失败: ' + (err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    const ok = await copyText(text);
    if (ok) toast.success('已复制到剪贴板');
    else toast.error('复制失败，请手动复制');
  };

  const handleFavorite = async (product: Product) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    const result = await toggleFavorite(product.objectId, user.objectId);
    if (result.success) {
      setFavoritedIds(prev => {
        const newSet = new Set(prev);
        if (result.favorited) newSet.add(product.objectId);
        else newSet.delete(product.objectId);
        return newSet;
      });
      toast.success(result.favorited ? '已收藏' : '已取消收藏');
    }
  };

  const handleLike = async (product: Product) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    const result = await toggleLike(product.objectId, user.objectId);
    if (result.success) {
      setLikedIds(prev => {
        const newSet = new Set(prev);
        if (result.liked) newSet.add(product.objectId);
        else newSet.delete(product.objectId);
        return newSet;
      });
      setProducts(prev => prev.map(p => 
        p.objectId === product.objectId 
          ? { ...p, likeCount: (p.likeCount || 0) + (result.liked ? 1 : -1) }
          : p
      ));
      toast.success(result.liked ? '已点赞' : '已取消点赞');
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
    if (!confirm('确定要清空您创建的商城模拟数据吗？')) return;
    const result = await clearMarketMockProducts(user.web3Address || user.objectId);
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
    const result = await initMarketMockProducts(user.web3Address || user.objectId);
    if (result.success) {
      toast.success(result.message || '创建成功');
      fetchProducts();
    } else {
      toast.error(result.error || '创建失败');
    }
  };

  const openCommentDialog = async (product: Product) => {
    setSelectedProduct(product);
    setCommentDialogOpen(true);
    setCommentPage(1);
    setComments([]);
    loadComments(product.objectId, 1);
  };

  const loadComments = async (productId: string, pageNum: number) => {
    setCommentsLoading(true);
    const result = await getProductComments(productId, pageNum, 10);
    if (result.success) {
      if (pageNum === 1) setComments(result.data);
      else setComments(prev => [...prev, ...result.data]);
      setCommentsTotal(result.total);
    }
    setCommentsLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!user || !selectedProduct) {
      toast.error('请先登录');
      return;
    }
    if (!commentText.trim()) {
      toast.error('请输入评论内容');
      return;
    }
    const result = await createComment({
      productId: selectedProduct.objectId,
      userId: user.objectId,
      userName: user.username || '用户',
      userAvatar: user.avatar,
      content: commentText.trim(),
    });
    if (result.success) {
      toast.success('评论成功');
      setCommentText('');
      loadComments(selectedProduct.objectId, 1);
      setCommentPage(1);
      setProducts(prev => prev.map(p => 
        p.objectId === selectedProduct.objectId 
          ? { ...p, commentCount: (p.commentCount || 0) + 1 }
          : p
      ));
    } else {
      toast.error(result.error || '评论失败');
    }
  };

  const loadMoreComments = () => {
    if (selectedProduct) {
      const nextPage = commentPage + 1;
      setCommentPage(nextPage);
      loadComments(selectedProduct.objectId, nextPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AIIP商城</h1>
          <p className="text-muted-foreground">发现和购买优质AI创作资产</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClearMock}>清空模拟数据</Button>
          <Button variant="outline" size="sm" onClick={handleCreateMock}>创建模拟数据</Button>
          <Link href="/cart">
            <Button><ShoppingCart className="mr-2 h-4 w-4" />购物车</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索商品..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value === '') { setPage(1); fetchProducts(); } }} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchProducts(); } }} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="分类" /></SelectTrigger>
            <SelectContent>{categories.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="排序" /></SelectTrigger>
            <SelectContent>{sortOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
          </Select>
          <Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Badge key={cat.value} variant={category === cat.value ? 'default' : 'outline'} className="cursor-pointer" onClick={() => { setCategory(cat.value); setPage(1); }}>{cat.label}</Badge>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Image className="h-16 w-16 mb-4" /><p>暂无商品</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const CategoryIcon = categoryIcons[product.category] || Image;
            const isLiked = likedIds.has(product.objectId);
            const isFavorited = favoritedIds.has(product.objectId);
            return (
              <Card key={product.objectId} className="group overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {product.cover ? (<img src={product.cover} alt={product.name} className="h-full w-full object-cover" />) : (<div className="flex h-full items-center justify-center"><CategoryIcon className="h-16 w-16 text-muted-foreground/50" /></div>)}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="icon" variant="secondary" onClick={() => handleAddToCart(product)} title="加入购物车"><ShoppingCart className="h-4 w-4" /></Button>
                    <Button size="icon" variant="secondary" onClick={() => handleFavorite(product)} className={cn(isFavorited && "bg-yellow-500 hover:bg-yellow-600 text-white")} title={isFavorited ? "取消收藏" : "收藏"}><Bookmark className={cn("h-4 w-4", isFavorited && "fill-current")} /></Button>
                    <Button size="icon" variant="secondary" onClick={() => openCommentDialog(product)} title="查看评论"><MessageCircle className="h-4 w-4" /></Button>
                    <Button size="icon" variant="secondary" onClick={async () => { const ok = await copyText(window.location.origin + '/market/' + product.objectId); if (ok) toast.success('链接已复制'); else toast.error('复制失败，请手动复制'); }} title="分享"><Share2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="truncate font-medium hover:text-primary cursor-pointer" onClick={() => { setDetailProduct(product); setDetailDialogOpen(true); }}>{product.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{product.creatorName || '匿名创作者'}</p>
                  <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <span>{product.sales || 0} 销量</span><span>|</span><span>{product.favoriteCount || 0} 收藏</span><span>|</span><span>{product.commentCount || 0} 评论</span><span>|</span><span>{product.likeCount || 0} 赞</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">¥{product.price}</span>
                    {product.originalPrice && (<span className="text-sm text-muted-foreground line-through">¥{product.originalPrice}</span>)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {product.owner?.toLowerCase() === user?.web3Address?.toLowerCase() ? (
                      <Button className="flex-1" variant="secondary" disabled>我的商品</Button>
                    ) : (
                      <Button className="flex-1" onClick={() => handlePurchase(product)}>立即购买</Button>
                    )}
                    <Button variant={isLiked ? "default" : "outline"} size="icon" onClick={() => handleLike(product)} className={cn(isLiked && "bg-red-500 hover:bg-red-600")} title={isLiked ? "取消点赞" : "点赞"}><ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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

      {/* 评论弹窗 */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>评论 - {selectedProduct?.name}</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Textarea placeholder="写下你的评论..." value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 resize-none" rows={2} />
            <Button onClick={handleSubmitComment} disabled={!commentText.trim()}><Send className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {commentsLoading && comments.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无评论</p>
            ) : (
              <>
                {comments.map((comment) => (
                  <div key={comment.objectId} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">{comment.userName?.[0] || '?'}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.userName || '匿名用户'}</span>
                        <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length < commentsTotal && (
                  <div className="flex justify-center">
                    <Button variant="ghost" size="sm" onClick={loadMoreComments} disabled={commentsLoading}>
                      {commentsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}加载更多评论
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 支付弹窗 */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>完成支付</DialogTitle></DialogHeader>
          {pendingOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">商品</span><span className="font-medium">{pendingOrder.productName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">订单号</span><span className="text-sm">{pendingOrder.orderNo}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">金额</span><span className="text-lg font-bold text-primary">￥{pendingOrder.amount}</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">卖家地址</label>
                <div className="flex gap-2">
                  <Input value={pendingOrder.sellerAddress} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(pendingOrder.sellerAddress)}>复制</Button>
                </div>
              </div>
              
              {/* 私钥状态显示（无MetaMask时） */}
              {!hasExternalWallet() && (
                <div className="space-y-2">
                  {storedPrivateKey ? (
                    // 已有内存私钥
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                        <span>✅</span>
                        将使用{walletType === 'mnemonic' ? '助记词' : '私钥'}登录时的钱包进行链上转账
                      </p>
                    </div>
                  ) : (
                    // 无内存私钥，需要输入
                    <>
                      <label className="text-sm font-medium">输入私钥进行链上转账</label>
                      <Input 
                        type="password"
                        placeholder="私钥（0x...）或留空使用模拟转账" 
                        value={privateKeyInput} 
                        onChange={(e) => setPrivateKeyInput(e.target.value)} 
                        className="font-mono text-xs" 
                      />
                      <p className="text-xs text-muted-foreground">
                        ⚠️ 私钥仅在本地使用，不会上传服务器
                      </p>
                    </>
                  )}
                </div>
              )}
                            
              {/* 主要支付按钮 */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPaymentDialogOpen(false)}>稍后支付</Button>
                <Button className="flex-1" onClick={handleConfirmPayment} disabled={verifying}>
                  {verifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />支付中...</> : '确认支付'}
                </Button>
              </div>
                            
              {/* 手动验证备选方式 */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">已手动转账？输入交易Hash验证：</p>
                <div className="flex gap-2">
                  <Input placeholder="0x..." value={txHashInput} onChange={(e) => setTxHashInput(e.target.value)} className="font-mono text-xs flex-1" />
                  <Button variant="outline" size="sm" onClick={handleVerifyPayment} disabled={verifying || !txHashInput.trim()}>
                    验证
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">稍后支付可在"我的订单"中继续完成</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 商品详情弹窗 */}
      <ProductDetailDialog
        product={detailProduct}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onPurchase={handlePurchase}
        onAddToCart={handleAddToCart}
        onFavorite={handleFavorite}
        onLike={handleLike}
        isLiked={detailProduct ? likedIds.has(detailProduct.objectId) : false}
        isFavorited={detailProduct ? favoritedIds.has(detailProduct.objectId) : false}
      />
    </div>
  );
}
