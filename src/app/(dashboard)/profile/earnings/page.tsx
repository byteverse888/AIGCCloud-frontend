'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowLeft, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Loader2, CreditCard, Building2, Package, Eye, Star, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store';
import { getUserEarnings, getUserEarningStats, EarningRecord, getUserProducts } from '@/lib/parse-actions';
import { userApi } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function EarningsPage() {
  const { user } = useAuthStore();
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    pending: 0,
    withdrawn: 0,
  });
  const [earningsHistory, setEarningsHistory] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorStats, setCreatorStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalViews: 0,
    avgRating: 0,
  });
  
  // 提现对话框状态
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'alipay' | 'wechat' | 'bank'>('alipay');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const growthRate = earningsData.lastMonth > 0 
    ? ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth * 100).toFixed(1)
    : '0';
  const isGrowth = parseFloat(growthRate) > 0;

  const loadEarnings = async () => {
    if (!user?.objectId) return;
    
    setLoading(true);
    try {
      const [statsResult, historyResult] = await Promise.all([
        getUserEarningStats(user.objectId),
        getUserEarnings(user.objectId),
      ]);
      
      if (statsResult.success && statsResult.data) {
        setEarningsData(statsResult.data);
      }
      if (historyResult.success) {
        setEarningsHistory(historyResult.data);
      }

      // 加载创作者作品统计
      if (user.web3Address) {
        const productsResult = await getUserProducts(user.web3Address, { limit: 1000 });
        if (productsResult.success && productsResult.data) {
          const products = productsResult.data;
          const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0);
          const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
          const ratedProducts = products.filter(p => p.rating && p.rating > 0);
          const avgRating = ratedProducts.length > 0
            ? ratedProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / ratedProducts.length
            : 0;
          setCreatorStats({
            totalProducts: products.length,
            totalSales,
            totalViews,
            avgRating: Math.round(avgRating * 10) / 10,
          });
        }
      }
    } catch (error) {
      toast.error('加载收益数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, [user?.objectId]);

  const handleWithdrawSubmit = async () => {
    if (!user?.objectId) {
      toast.error('请先登录');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的提现金额');
      return;
    }

    if (amount < 10) {
      toast.error('最低提现金额为10元');
      return;
    }

    if (amount > earningsData.pending) {
      toast.error('提现金额超过可提现余额');
      return;
    }

    if (!withdrawAccount.trim()) {
      toast.error('请输入收款账号');
      return;
    }

    if (!withdrawAccountName.trim()) {
      toast.error('请输入账户名');
      return;
    }

    if (withdrawMethod === 'bank' && !withdrawBankName.trim()) {
      toast.error('请输入开户银行');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await userApi.withdraw({
        amount,
        method: withdrawMethod,
        account: withdrawAccount,
        account_name: withdrawAccountName,
        bank_name: withdrawMethod === 'bank' ? withdrawBankName : undefined,
      });

      if (result.success) {
        toast.success('提现申请已提交，请等待审核');
        setWithdrawDialogOpen(false);
        // 重置表单
        setWithdrawAmount('');
        setWithdrawAccount('');
        setWithdrawAccountName('');
        setWithdrawBankName('');
        // 重新加载数据
        loadEarnings();
      } else {
        toast.error(result.error || '提现申请失败');
      }
    } catch (error) {
      toast.error('提现申请失败');
    } finally {
      setIsSubmitting(false);
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
        {/* 收益概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">累计收益</p>
                  <p className="text-2xl font-bold">¥{earningsData.totalEarnings}</p>
                </div>
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">本月收益</p>
                  <p className="text-2xl font-bold">¥{earningsData.thisMonth}</p>
                  <div className={`flex items-center text-sm ${isGrowth ? 'text-green-500' : 'text-red-500'}`}>
                    {isGrowth ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {growthRate}%
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待结算</p>
                  <p className="text-2xl font-bold">¥{earningsData.pending}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已提现</p>
                  <p className="text-2xl font-bold">¥{earningsData.withdrawn}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <Button className="w-full mt-4" size="sm" onClick={() => setWithdrawDialogOpen(true)}>
                申请提现
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 创作者数据看板 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xl font-bold">{creatorStats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">我的作品</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xl font-bold">{creatorStats.totalSales}</p>
                <p className="text-xs text-muted-foreground">总销量</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-xl font-bold">{creatorStats.totalViews}</p>
                <p className="text-xs text-muted-foreground">总浏览</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-xl font-bold">{creatorStats.avgRating || '-'}</p>
                <p className="text-xs text-muted-foreground">平均评分</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 收益明细 */}
        <Card>
          <CardHeader>
            <CardTitle>收益明细</CardTitle>
            <CardDescription>查看您的收益记录</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {earningsHistory.map((item) => (
                  <div key={item.objectId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {item.type === 'sale' ? '商品售出' : item.type === 'withdraw' ? '提现' : '奖励'}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={item.amount > 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                        {item.amount > 0 ? '+' : ''}¥{Math.abs(item.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {earningsHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">暂无收益记录</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 提现对话框 */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>申请提现</DialogTitle>
            <DialogDescription>
              可提现余额：¥{earningsData.pending}，最低提现金额为10元
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>提现金额</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  type="number"
                  placeholder="请输入提现金额"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-8"
                  min={10}
                  max={earningsData.pending}
                />
              </div>
              <Button
                variant="link"
                className="p-0 h-auto text-xs"
                onClick={() => setWithdrawAmount(earningsData.pending.toString())}
              >
                全部提现
              </Button>
            </div>

            <div className="space-y-2">
              <Label>提现方式</Label>
              <Select value={withdrawMethod} onValueChange={(v) => setWithdrawMethod(v as 'alipay' | 'wechat' | 'bank')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alipay">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      支付宝
                    </div>
                  </SelectItem>
                  <SelectItem value="wechat">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      微信
                    </div>
                  </SelectItem>
                  <SelectItem value="bank">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      银行卡
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {withdrawMethod === 'alipay' ? '支付宝账号' : withdrawMethod === 'wechat' ? '微信号' : '银行卡号'}
              </Label>
              <Input
                placeholder={`请输入${withdrawMethod === 'alipay' ? '支付宝账号' : withdrawMethod === 'wechat' ? '微信号' : '银行卡号'}`}
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>账户名</Label>
              <Input
                placeholder="请输入真实姓名"
                value={withdrawAccountName}
                onChange={(e) => setWithdrawAccountName(e.target.value)}
              />
            </div>

            {withdrawMethod === 'bank' && (
              <div className="space-y-2">
                <Label>开户银行</Label>
                <Input
                  placeholder="请输入开户银行名称"
                  value={withdrawBankName}
                  onChange={(e) => setWithdrawBankName(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleWithdrawSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '确认提现'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
