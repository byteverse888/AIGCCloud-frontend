'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, ArrowLeft, ShoppingCart, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuthStore, useCartStore } from '@/store';
import { getUserFavorites, toggleFavorite } from '@/lib/parse-actions';
import toast from 'react-hot-toast';

interface FavoriteItem {
  objectId: string;
  productId: string;
  product?: {
    objectId: string;
    name: string;
    price: number;
    category: string;
    creatorName?: string;
    cover?: string;
  } | null;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const { user } = useAuthStore();
  const { addItem } = useCartStore();

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const result = await getUserFavorites(user.objectId, page, pageSize);
    if (result.success) {
      setFavorites(result.data as FavoriteItem[]);
      setTotal(result.total);
    }
    setLoading(false);
  }, [user, page]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const totalPages = Math.ceil(total / pageSize);

  const handleRemove = async (productId: string) => {
    if (!user) return;
    const result = await toggleFavorite(productId, user.objectId);
    if (result.success) {
      toast.success('已取消收藏');
      fetchFavorites();
    }
  };

  const handleAddToCart = async (item: FavoriteItem) => {
    if (!item.product) return;
    if (!user?.objectId) {
      toast.error('请先登录');
      return;
    }
    try {
      await addItem({
        productId: item.productId,
        name: item.product.name,
        price: item.product.price,
      });
      toast.success('已加入购物车');
    } catch (e: any) {
      toast.error(e?.message || '加入购物车失败');
    }
  };
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/profile">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回用户中心
        </Link>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              我的收藏
            </CardTitle>
            <CardDescription>共收藏了 {total} 个商品</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无收藏商品</p>
                <Button className="mt-4" asChild>
                  <Link href="/market">去商城逛逛</Link>
                </Button>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((item) => (
                  <Card key={item.objectId} className="overflow-hidden">
                    <div className="h-40 bg-muted flex items-center justify-center">
                      {item.product?.cover ? (
                        <img src={item.product.cover} alt={item.product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Bookmark className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <Badge variant="secondary" className="mb-2">
                        {item.product?.category || '未分类'}
                      </Badge>
                      <h3 className="font-medium truncate">
                        {item.product?.name || '商品已下架'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.product?.creatorName || '匿名创作者'}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-lg font-bold text-primary">
                          ¥{item.product?.price || 0}
                        </span>
                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" onClick={() => handleAddToCart(item)}>
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            onClick={() => handleRemove(item.productId)}
                            className="text-yellow-500 hover:text-yellow-600"
                            title="取消收藏"
                          >
                            <Bookmark className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {total > 0 && (
                <div className="mt-6 flex items-center justify-between">
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
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
