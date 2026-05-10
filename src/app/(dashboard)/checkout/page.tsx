'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, Wallet, QrCode, Loader2, CheckCircle } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/store';
import { paymentApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

type PaymentMethod = 'wechat' | 'alipay';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const totalPrice = getTotalPrice();

  useEffect(() => {
    if (items.length === 0 && !orderCreated) {
      router.push('/cart');
    }
  }, [items, orderCreated, router]);

  // 轮询订单状态
  const pollOrderStatus = useCallback(async (oid: string) => {
    if (!oid) return;
    
    try {
      const result = await paymentApi.queryOrder(oid);
      if (result.status === 'paid') {
        setPolling(false);
        await clearCart();
        toast.success('支付成功！');
        setTimeout(() => {
          router.push('/profile/orders');
        }, 1500);
      }
    } catch {
      // 忽略错误，继续轮询
    }
  }, [clearCart, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling && orderId) {
      interval = setInterval(() => {
        pollOrderStatus(orderId);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling, orderId, pollOrderStatus]);

  const handlePayment = async () => {
    if (!user?.objectId) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }

    if (items.length === 0) {
      toast.error('购物车为空');
      return;
    }

    setIsProcessing(true);

    try {
      // 调用后端创建购物车订单
      const orderResult = await paymentApi.createCartOrder({
        user_id: user.objectId,
        items: items.map(item => ({
          product_id: item.productId || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
      });

      setOrderId(orderResult.order_id);
      setOrderNo(orderResult.order_no);
      setOrderCreated(true);

      // 生成支付二维码
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        orderResult.qr_code || `${paymentMethod === 'wechat' ? 'weixin' : 'alipay'}://pay?order=${orderResult.order_no}&amount=${totalPrice}`
      )}`;
      setQrCodeUrl(qrUrl);

      toast.success('订单创建成功，请扫码支付');
      
      // 开始轮询订单状态
      setPolling(true);

    } catch (error) {
      toast.error((error as Error).message || '创建订单失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 测试模式：模拟支付
  const handleMockPay = async () => {
    if (!orderId) return;
    
    try {
      await paymentApi.mockPay(orderId);
      setPolling(false);
      await clearCart();
      toast.success('支付成功！');
      setTimeout(() => {
        router.push('/profile/orders');
      }, 1500);
    } catch (error) {
      toast.error((error as Error).message || '模拟支付失败');
    }
  };

  if (items.length === 0 && !orderCreated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/cart">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回购物车
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">确认订单</h1>
        <p className="text-muted-foreground">请确认您的订单信息并选择支付方式</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 订单商品列表 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>订单商品</CardTitle>
              <CardDescription>共 {items.length} 件商品</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded" />
                    ) : (
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">数量: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">¥{(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">¥{item.price} × {item.quantity}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 支付方式选择 */}
          <Card>
            <CardHeader>
              <CardTitle>支付方式</CardTitle>
              <CardDescription>请选择您的支付方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'wechat' ? 'border-green-500 bg-green-500/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => !orderCreated && setPaymentMethod('wechat')}
              >
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">微信支付</p>
                  <p className="text-sm text-muted-foreground">推荐使用微信扫码支付</p>
                </div>
                {paymentMethod === 'wechat' && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>

              <div
                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-500/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => !orderCreated && setPaymentMethod('alipay')}
              >
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">支付宝</p>
                  <p className="text-sm text-muted-foreground">使用支付宝扫码支付</p>
                </div>
                {paymentMethod === 'alipay' && (
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 订单摘要 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>订单摘要</CardTitle>
              {orderNo && (
                <CardDescription>订单号: {orderNo}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品总价</span>
                <span>¥{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">优惠折扣</span>
                <span className="text-green-500">-¥0.00</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>应付金额</span>
                <span className="text-primary">¥{totalPrice.toFixed(2)}</span>
              </div>

              {!orderCreated ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建订单中...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      确认支付
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    请使用{paymentMethod === 'wechat' ? '微信' : '支付宝'}扫描下方二维码完成支付
                  </p>
                  {qrCodeUrl && (
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-lg border">
                        <img src={qrCodeUrl} alt="支付二维码" className="w-48 h-48" />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <Loader2 className="inline-block mr-1 h-3 w-3 animate-spin" />
                    等待支付中...
                  </p>
                  
                  {/* 测试模式：模拟支付按钮 */}
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      测试模式：点击下方按钮模拟支付成功
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleMockPay}
                    >
                      模拟支付成功
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <QrCode className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  支付完成后，您购买的商品将自动添加到您的资产中，可在「我的资产」中查看和下载。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
