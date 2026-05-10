'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const loading = useCartStore((s) => s.loading);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);

  // 进页时从后端拉取最新购物车（保证多端同步）
  useEffect(() => {
    if (user?.objectId) {
      fetchCart();
    }
  }, [user?.objectId, fetchCart]);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('购物车为空');
      return;
    }
    if (!user?.objectId) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    router.push('/checkout');
  };

  const handleRemove = async (productId: string) => {
    try {
      await removeItem(productId);
      toast.success('已从购物车移除');
    } catch (e: any) {
      toast.error(e?.message || '移除失败');
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      toast.success('购物车已清空');
    } catch (e: any) {
      toast.error(e?.message || '清空失败');
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">购物车</h1>
          <p className="text-muted-foreground">管理您的购物车商品</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="h-24 w-24 text-muted-foreground/50" />
            <p className="mt-4 text-lg text-muted-foreground">购物车是空的</p>
            <Link href="/market">
              <Button className="mt-4">去购物</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">购物车</h1>
          <p className="text-muted-foreground">共 {items.length} 件商品</p>
        </div>
        <Button variant="outline" onClick={handleClear}>
          清空购物车
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {items.map((item, index) => (
                <div key={item.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-20 w-20 rounded bg-muted" />
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-lg font-bold text-primary">¥{item.price}</p>
                      <p className="mt-1 text-xs text-muted-foreground">数字资产仅限购买 1 份</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">¥{item.price.toFixed(2)}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 text-destructive"
                        onClick={() => handleRemove(item.productId)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>订单摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品总价</span>
                <span>¥{getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">优惠折扣</span>
                <span className="text-green-500">-¥0.00</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>应付金额</span>
                <span className="text-primary">¥{getTotalPrice().toFixed(2)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleCheckout}>
                立即结算
              </Button>
              <Link href="/market">
                <Button variant="outline" className="w-full">
                  继续购物
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
