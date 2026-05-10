'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store';
import { memberApi } from '@/lib/api';
import { Crown, History, CheckCircle, Clock, XCircle, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
// QR Code library - install: npm install qrcode.react
// import { QRCodeSVG } from 'qrcode.react';

// 套餐信息类型
interface PlanInfo {
  plan_id: string;
  name: string;
  level: string;
  days: number;
  price: number;
  original_price: number;
  discount: number;
  bonus: number;
}

// 订单信息类型
interface OrderInfo {
  orderId: string;
  planId: string;
  planName: string;
  level: string;
  days: number;
  amount: number;
  bonus: number;
  status: string;
  createdAt: string;
  paidAt?: string;
}

// 时长选项配置
const DURATION_OPTIONS = [
  { key: 'month', label: '1个月', days: 30, discount: null },
  { key: 'half', label: '半年', days: 180, discount: '9折' },
  { key: 'year', label: '1年', days: 365, discount: '8.5折' },
  { key: '3year', label: '3年', days: 1095, discount: '8折' },
  { key: '5year', label: '5年', days: 1825, discount: '7.5折' },
];

// 权益对比配置
const BENEFITS = [
  { name: 'AI对话次数', normal: '100次/天', vip: '1000次/天', svip: '无限制', isVipHighlight: true, isSvipHighlight: true },
  { name: 'AI绘图次数', normal: '10次/天', vip: '100次/天', svip: '500次/天', isVipHighlight: true, isSvipHighlight: true },
  { name: '高级模型访问', normal: false, vip: true, svip: true },
  { name: '优先响应', normal: false, vip: true, svip: true },
  { name: '专属客服', normal: false, vip: false, svip: true },
  { name: 'API调用', normal: false, vip: true, svip: true },
  { name: '商业授权', normal: false, vip: false, svip: true },
  { name: '积分奖励', normal: '1x', vip: '2x', svip: '5x', isVipHighlight: true, isSvipHighlight: true },
];

export default function MembershipPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('subscribe');
  const [memberLevel, setMemberLevel] = useState<'vip' | 'svip'>('vip');
  const [selectedDuration, setSelectedDuration] = useState('month');
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [payDialog, setPayDialog] = useState(false);
  const [payInfo, setPayInfo] = useState<{ orderId: string; codeUrl?: string; testMode?: boolean } | null>(null);
  
  // 会员状态（从后端获取）
  const [memberStatus, setMemberStatus] = useState<{
    member_level: string;
    member_expire_at?: string;
    is_expired: boolean;
  } | null>(null);

  // 从后端刷新会员状态
  const refreshMemberStatus = async () => {
    try {
      if (!user?.objectId) return;

      const status = await memberApi.getStatus(user.objectId);
      setMemberStatus(status);
      // 同步更新 user store 中的 memberLevel
      if (status.member_level !== user.memberLevel) {
        setUser({ ...user, memberLevel: status.member_level as 'normal' | 'vip' | 'svip' });
      }
    } catch (error) {
      console.error('获取会员状态失败:', error);
    }
  };

  // 页面加载时获取会员状态
  useEffect(() => {
    refreshMemberStatus();
  }, [user?.objectId]);

  // 加载套餐列表
  useEffect(() => {
    async function loadPlans() {
      try {
        const result = await memberApi.getPlans();
        setPlans(result);
      } catch (error) {
        console.error('加载套餐失败:', error);
        toast.error('加载套餐失败');
      } finally {
        setPlansLoading(false);
      }
    }
    loadPlans();
  }, []);

  // 加载订阅记录
  useEffect(() => {
    async function loadOrders() {
      if (!user?.objectId) return;
      setOrdersLoading(true);
      try {
        const result = await memberApi.getOrders(user.objectId);
        setOrders(result.orders || []);
      } catch (error) {
        console.error('加载订阅记录失败:', error);
      } finally {
        setOrdersLoading(false);
      }
    }
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [user?.objectId, activeTab]);

  // 获取当前选中的套餐
  const selectedPlan = useMemo(() => {
    const planId = `${memberLevel}_${selectedDuration}`;
    return plans.find(p => p.plan_id === planId);
  }, [plans, memberLevel, selectedDuration]);

  // 获取特定等级和时长的套餐
  const getPlanByLevelAndDuration = (level: string, duration: string) => {
    const planId = `${level}_${duration}`;
    return plans.find(p => p.plan_id === planId);
  };

  // 计算每月价格
  const getMonthlyPrice = (price: number, days: number) => {
    return (price / (days / 30)).toFixed(1);
  };

  // 订阅处理
  const handleSubscribe = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (!selectedPlan) {
      toast.error('请选择套餐');
      return;
    }

    setLoading(true);
    try {
      const result = await memberApi.subscribe({
        user_id: user.objectId,
        plan_id: selectedPlan.plan_id,
      });

      if (result.success) {
        setPayInfo({
          orderId: result.order_id || '',
          codeUrl: result.pay_params?.code_url,
          testMode: result.pay_params?.test_mode,
        });
        setPayDialog(true);
      } else {
        toast.error(result.message || '创建订单失败');
      }
    } catch (error) {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 模拟支付
  const handleSimulatePay = async () => {
    if (!payInfo?.orderId) return;

    setLoading(true);
    try {
      const result = await memberApi.simulatePay({
        order_id: payInfo.orderId,
      });

      if (result.success) {
        toast.success(result.message || '支付成功！');
        setPayDialog(false);
        
        // 从服务器获取最新的用户会员状态
        await refreshMemberStatus();
        
        // 切换到订单记录tab
        setActiveTab('orders');
      } else {
        toast.error(result.message || '支付失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 轮询检查支付状态（真实支付时使用）
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [paymentChecking, setPaymentChecking] = useState(false);

  const startPaymentPolling = useCallback(() => {
    if (!payInfo?.orderId || payInfo?.testMode) return;

    let count = 0;
    const maxCount = 60; // 最多轮询3分钟

    pollingRef.current = setInterval(async () => {
      count++;
      try {
        const result = await memberApi.checkOrderStatus(payInfo.orderId);

        if (result.status === 'paid') {
          // 支付成功
          stopPaymentPolling();
          toast.success('支付成功！');
          setPayDialog(false);
          await refreshMemberStatus();
          setActiveTab('orders');
        } else if (result.status === 'failed' || result.status === 'cancelled') {
          // 支付失败或取消
          stopPaymentPolling();
          toast.error('支付失败或已取消');
        } else if (count >= maxCount) {
          // 超时
          stopPaymentPolling();
          toast.error('支付超时，请重新下单');
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      }
    }, 3000);
  }, [payInfo]);

  const stopPaymentPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPaymentChecking(false);
  }, []);

  // 支付对话框打开时开始轮询
  useEffect(() => {
    if (payDialog && payInfo && !payInfo.testMode) {
      startPaymentPolling();
    }
    return () => stopPaymentPolling();
  }, [payDialog, payInfo, startPaymentPolling, stopPaymentPolling]);

  // 获取订单状态Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            已支付
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            待支付
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            失败
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="pt-0 pb-4 px-2 md:px-4 max-w-6xl">
      {/* 页面头部 */}
      <div className="flex items-center gap-3 mb-6">
        <Crown className="h-8 w-8 text-yellow-500" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">会员订阅</h1>
            {memberStatus && memberStatus.member_level !== 'normal' && !memberStatus.is_expired && (
              <Badge 
                className={`${
                  memberStatus.member_level === 'svip' 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-yellow-500 hover:bg-yellow-600'
                } text-black font-medium`}
              >
                {memberStatus.member_level.toUpperCase()}
                {memberStatus.member_expire_at && (
                  <span className="ml-1">
                    至 {new Date(memberStatus.member_expire_at).toISOString().split('T')[0]}
                  </span>
                )}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">开通会员，享受更多权益</p>
        </div>
      </div>

      {/* 主Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="subscribe" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            订阅会员
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            订单记录
          </TabsTrigger>
        </TabsList>

        {/* 订阅会员 Tab */}
        <TabsContent value="subscribe">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：套餐选择 */}
            <div className="lg:col-span-2 space-y-6">
              {/* VIP/SVIP 选择 */}
              <Card className="border-border">
                <CardContent className="p-0">
                  <div className="grid grid-cols-2">
                    <button
                      onClick={() => setMemberLevel('vip')}
                      className={`py-4 px-6 text-center transition-all border-b-2 ${
                        memberLevel === 'vip'
                          ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <div className="text-lg font-bold">VIP</div>
                      <div className="text-sm text-muted-foreground">基础会员</div>
                    </button>
                    <button
                      onClick={() => setMemberLevel('svip')}
                      className={`py-4 px-6 text-center transition-all border-b-2 ${
                        memberLevel === 'svip'
                          ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <div className="text-lg font-bold">SVIP</div>
                      <div className="text-sm text-muted-foreground">超级会员</div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* 时长选择 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">选择时长</CardTitle>
                </CardHeader>
                <CardContent>
                  {plansLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {DURATION_OPTIONS.map((option) => {
                        const plan = getPlanByLevelAndDuration(memberLevel, option.key);
                        if (!plan) return null;
                        const isSelected = selectedDuration === option.key;
                        const monthlyPrice = getMonthlyPrice(plan.price, plan.days);

                        return (
                          <button
                            key={option.key}
                            onClick={() => setSelectedDuration(option.key)}
                            className={`relative p-4 rounded-lg border-2 transition-all text-center ${
                              isSelected
                                ? 'border-yellow-500 bg-yellow-500/5'
                                : 'border-border hover:border-yellow-500/50'
                            }`}
                          >
                            {option.discount && (
                              <Badge className="absolute -top-2 -right-2 bg-red-500 text-xs">
                                {option.discount}
                              </Badge>
                            )}
                            <div className="text-sm font-medium mb-2">{option.label}</div>
                            <div className="text-xl font-bold text-yellow-500">
                              ¥{plan.price.toFixed(2)}
                            </div>
                            {plan.original_price > plan.price && (
                              <div className="text-xs text-muted-foreground line-through">
                                ¥{plan.original_price.toFixed(2)}
                              </div>
                            )}
                            {option.key !== 'month' && (
                              <div className="text-xs text-muted-foreground mt-1">
                                约¥{monthlyPrice}/月
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 权益对比 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">权益对比</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-muted-foreground font-normal">权益</th>
                          <th className="text-center py-3 px-4 text-muted-foreground font-normal">普通用户</th>
                          <th className="text-center py-3 px-4 text-yellow-500 font-normal">VIP</th>
                          <th className="text-center py-3 px-4 text-orange-500 font-normal">SVIP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {BENEFITS.map((benefit, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-4 px-4 text-sm">{benefit.name}</td>
                            <td className="py-4 px-4 text-center">
                              {typeof benefit.normal === 'boolean' ? (
                                benefit.normal ? (
                                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                )
                              ) : (
                                <span className="text-sm text-muted-foreground">{benefit.normal}</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {typeof benefit.vip === 'boolean' ? (
                                benefit.vip ? (
                                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                )
                              ) : (
                                <span className={`text-sm ${benefit.isVipHighlight ? 'text-yellow-500 font-medium' : ''}`}>
                                  {benefit.vip}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {typeof benefit.svip === 'boolean' ? (
                                benefit.svip ? (
                                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                )
                              ) : (
                                <span className={`text-sm ${benefit.isSvipHighlight ? 'text-orange-500 font-medium' : ''}`}>
                                  {benefit.svip}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：订单信息 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>订单信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPlan ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">套餐</span>
                        <span>{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">时长</span>
                        <span>
                          {selectedPlan.days >= 365
                            ? `${Math.floor(selectedPlan.days / 365)}年`
                            : selectedPlan.days >= 30
                            ? `${Math.floor(selectedPlan.days / 30)}个月`
                            : `${selectedPlan.days}天`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">赠送积分</span>
                        <span className="text-green-500">+{selectedPlan.bonus}</span>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">实付价</span>
                          <span className="text-3xl font-bold text-yellow-500">
                            ¥{selectedPlan.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium h-12 text-lg"
                        onClick={handleSubscribe}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            处理中...
                          </>
                        ) : (
                          '立即开通'
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      请选择套餐
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 订单记录 Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                订阅记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无订阅记录
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.orderId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.planName}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">¥{order.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{order.orderId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 支付对话框 */}
      <Dialog open={payDialog} onOpenChange={(open) => {
        setPayDialog(open);
        if (!open) stopPaymentPolling();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>完成支付</DialogTitle>
            <DialogDescription>
              {payInfo?.testMode ? '测试模式：点击按钮模拟支付' : '请使用微信扫码支付'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {payInfo?.testMode ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">订单号：{payInfo.orderId}</p>
                <Button onClick={handleSimulatePay} disabled={loading}>
                  {loading ? '处理中...' : '模拟支付成功'}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {payInfo?.codeUrl ? (
                  <>
                    {/* QR Code - 安装 qrcode.react 后取消下面注释 */}
                    {/* <QRCodeSVG value={payInfo.codeUrl} size={200} /> */}
                    
                    {/* 临时显示：安装 qrcode.react 后删除这部分 */}
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                      <div className="text-center text-sm text-muted-foreground p-4">
                        <p className="mb-2">二维码区域</p>
                        <p className="text-xs">安装 qrcode.react 后显示</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">请使用微信扫码支付</p>
                    <p className="text-xs text-muted-foreground">订单号：{payInfo.orderId}</p>
                    
                    {paymentChecking && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在等待支付结果...
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在生成支付码...
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
