'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Image,
  Mic,
  Video,
  BookImage,
  Music2,
  Bot,
  ShoppingCart,
  Bookmark,
  ThumbsUp,
  Share2,
  Star,
  Play,
  Pause,
  Download,
  Eye,
  Loader2,
} from 'lucide-react';
import { type Product } from '@/lib/parse-actions';
import { rateProduct, getUserRating } from '@/lib/parse-actions';
import { cn, copyText } from '@/lib/utils';
import { StarRating } from '@/components/ui/star-rating';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const categoryIcons: Record<string, typeof Image> = {
  image: Image,
  audio: Mic,
  video: Video,
  comic: BookImage,
  music: Music2,
  'digital-human': Bot,
};

const categoryLabels: Record<string, string> = {
  image: '图片',
  audio: '音频',
  video: '视频',
  comic: '图文漫画',
  music: '音乐',
  'digital-human': '数字人',
};

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onFavorite: (product: Product) => void;
  onLike: (product: Product) => void;
  isLiked: boolean;
  isFavorited: boolean;
}

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
  onPurchase,
  onAddToCart,
  onFavorite,
  onLike,
  isLiked,
  isFavorited,
}: ProductDetailDialogProps) {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    // 关闭弹窗时停止音频
    if (!open && audioRef) {
      audioRef.pause();
      setAudioPlaying(false);
    }
    // 打开弹窗时加载用户评分
    if (open && product && user?.objectId) {
      getUserRating(product.objectId, user.objectId).then((r) => {
        setUserRating(r ?? 0);
      });
    }
  }, [open, audioRef, product, user?.objectId]);

  if (!product) return null;

  const CategoryIcon = categoryIcons[product.category] || Image;

  const toggleAudio = () => {
    if (!audioRef) return;
    if (audioPlaying) {
      audioRef.pause();
    } else {
      audioRef.play();
    }
    setAudioPlaying(!audioPlaying);
  };

  const renderPreview = () => {
    const previewUrl = product.previewUrl || product.cover;

    if (product.category === 'video' && previewUrl) {
      return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={previewUrl}
            controls
            className="w-full h-full object-contain"
            poster={product.cover}
          />
        </div>
      );
    }

    if ((product.category === 'audio' || product.category === 'music') && previewUrl) {
      return (
        <div className="relative aspect-video bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
          <Music2 className="h-16 w-16 text-white/60 mb-4" />
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full"
            onClick={toggleAudio}
          >
            {audioPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <audio
            ref={(el) => setAudioRef(el)}
            src={previewUrl}
            onEnded={() => setAudioPlaying(false)}
          />
          <p className="text-white/60 text-sm mt-3">
            {audioPlaying ? '正在播放预览...' : '点击播放预览'}
          </p>
        </div>
      );
    }

    // 默认图片预览
    if (product.cover) {
      return (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={product.cover}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <CategoryIcon className="h-20 w-20 text-muted-foreground/30" />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
        </DialogHeader>

        {/* 预览区 */}
        {renderPreview()}

        {/* 基本信息 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <CategoryIcon className="h-3 w-3 mr-1" />
                {categoryLabels[product.category] || product.category}
              </Badge>
              {product.rating && (
                <div className="flex items-center gap-1 text-sm text-yellow-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">¥{product.price}</span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">¥{product.originalPrice}</span>
              )}
            </div>
          </div>

          <Separator />

          {/* 创作者信息 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
              {(product.creatorName || '匿名')[0]}
            </div>
            <div>
              <p className="font-medium">{product.creatorName || '匿名创作者'}</p>
              <p className="text-sm text-muted-foreground">创作者</p>
            </div>
          </div>

          {/* 描述 */}
          {product.description && (
            <div>
              <h4 className="font-medium mb-2">商品描述</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* 文件信息 */}
          {(product.fileFormat || product.fileSize || product.duration || product.dimensions) && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              {product.fileFormat && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">格式</span>
                  <span className="font-medium uppercase">{product.fileFormat}</span>
                </div>
              )}
              {product.fileSize && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">大小</span>
                  <span className="font-medium">{(product.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              )}
              {product.duration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">时长</span>
                  <span className="font-medium">{Math.floor(product.duration / 60)}:{String(product.duration % 60).padStart(2, '0')}</span>
                </div>
              )}
              {product.dimensions && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">尺寸</span>
                  <span className="font-medium">{product.dimensions}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* 统计数据 */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{product.sales || 0}</p>
              <p className="text-xs text-muted-foreground">销量</p>
            </div>
            <div>
              <p className="text-lg font-bold">{product.likeCount || 0}</p>
              <p className="text-xs text-muted-foreground">点赞</p>
            </div>
            <div>
              <p className="text-lg font-bold">{product.favoriteCount || 0}</p>
              <p className="text-xs text-muted-foreground">收藏</p>
            </div>
            <div>
              <p className="text-lg font-bold">{product.commentCount || 0}</p>
              <p className="text-xs text-muted-foreground">评论</p>
            </div>
          </div>

          <Separator />

          {/* 评分 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1">商品评分</p>
              <StarRating rating={product.rating || 0} readonly size="sm" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium mb-1">我的评分</p>
              <StarRating
                rating={userRating}
                size="md"
                onRate={async (r) => {
                  if (!user?.objectId) {
                    toast.error('请先登录');
                    return;
                  }
                  setRatingLoading(true);
                  const res = await rateProduct(product.objectId, user.objectId, r);
                  if (res.success) {
                    setUserRating(r);
                    toast.success('评分成功');
                  } else {
                    toast.error(res.error || '评分失败');
                  }
                  setRatingLoading(false);
                }}
                readonly={ratingLoading}
              />
            </div>
          </div>

          <Separator />

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onPurchase(product)}>
              立即购买
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onAddToCart(product)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              加入购物车
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isFavorited ? 'default' : 'outline'}
              className={cn('flex-1', isFavorited && 'bg-yellow-500 hover:bg-yellow-600')}
              onClick={() => onFavorite(product)}
            >
              <Bookmark className={cn('h-4 w-4 mr-2', isFavorited && 'fill-current')} />
              {isFavorited ? '已收藏' : '收藏'}
            </Button>
            <Button
              variant={isLiked ? 'default' : 'outline'}
              className={cn('flex-1', isLiked && 'bg-red-500 hover:bg-red-600')}
              onClick={() => onLike(product)}
            >
              <ThumbsUp className={cn('h-4 w-4 mr-2', isLiked && 'fill-current')} />
              {isLiked ? '已点赞' : '点赞'}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await copyText(window.location.origin + '/market?id=' + product.objectId);
                if (ok) toast.success('链接已复制');
                else toast.error('复制失败，请手动复制');
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
