'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Settings, 
  CreditCard, 
  ShoppingBag, 
  Heart, 
  Users, 
  Bell,
  Wallet,
  ChevronRight,
  Edit,
  Camera,
  Coins,
  Gift,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuthStore } from '@/store';
import { getUserStats, getUserEarningStats } from '@/lib/parse-actions';
import { incentiveApi } from '@/lib/api';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import toast from 'react-hot-toast';
import Link from 'next/link';

// 用户中心菜单
const profileMenus = [
  { icon: Settings, label: '账户设置', href: '/profile/settings', desc: '修改个人信息和密码' },
  { icon: Wallet, label: '创作收益', href: '/profile/earnings', desc: '查看收益和提现' },
  { icon: ShoppingBag, label: '我的订单', href: '/profile/orders', desc: '查看订单记录' },
  { icon: ShoppingBag, label: '我的购买', href: '/profile/purchases', desc: '已购商品下载' },
  { icon: CreditCard, label: '充值计费', href: '/profile/billing', desc: '充值和消费记录' },
  { icon: Bell, label: '消息中心', href: '/profile/notifications', desc: '系统通知和消息' },
  { icon: Heart, label: '我的收藏', href: '/profile/favorites', desc: '收藏的商品' },
  { icon: Users, label: '关注作者', href: '/profile/following', desc: '关注的创作者' },
];

type ExchangeDirection = 'to_web3' | 'to_balance';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { url: avatarUrl } = useSignedUrl(user?.avatarKey);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    assetCount: 0,
    orderCount: 0,
    followerCount: 0,
    followingCount: 0,
  });
  const [totalEarnings, setTotalEarnings] = useState(0);

  // 账户积分 + 链上金币（仅在绑 web3 后有值）
  const [balance, setBalance] = useState<number>(0);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // 签到
  const [signed, setSigned] = useState<boolean>(false);
  const [continuousDays, setContinuousDays] = useState<number>(0);
  const [signLoading, setSignLoading] = useState(false);

  // 兑换
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [exchangeDirection, setExchangeDirection] = useState<ExchangeDirection>('to_web3');
  const [exchangeAmount, setExchangeAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<{ points: number; coins: number }>({ points: 100, coins: 1 });
  const [exchanging, setExchanging] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!user?.objectId) return;
    setBalanceLoading(true);
    try {
      const res = await incentiveApi.getBalance();
      setBalance(Number(res.balance || 0));
      // 后端：未绑 web3 时 coins 为 null
      setCoinBalance(res.coins == null ? null : Number(res.coins));
      // 同步到 store（购买/签到/兑换后刷新）
      if (user && Number(res.balance || 0) !== Number(user.totalIncentive || 0)) {
        setUser({ ...user, totalIncentive: Number(res.balance || 0) });
      }
    } catch (e) {
      console.error('[profile] 加载余额失败', e);
    } finally {
      setBalanceLoading(false);
    }
  }, [user, setUser]);

  const loadSignStatus = useCallback(async () => {
    try {
      const r = await incentiveApi.getDailySignStatus();
      setSigned(!!r.signed);
      setContinuousDays(Number(r.continuousDays || 0));
    } catch (e) {
      console.error('[profile] 加载签到状态失败', e);
    }
  }, []);

  const loadExchangeRate = useCallback(async () => {
    try {
      const r = await incentiveApi.getExchangeRate();
      setExchangeRate({ points: Number(r.points || 100), coins: Number(r.coins || 1) });
    } catch (e) {
      console.error('[profile] 加载兑换比例失败', e);
    }
  }, []);

  useEffect(() => {
    async function loadUserData() {
      if (!user?.objectId) return;
      try {
        const statsResult = await getUserStats(user.objectId);
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
        const earningsResult = await getUserEarningStats(user.objectId);
        if (earningsResult.success && earningsResult.data) {
          setTotalEarnings(earningsResult.data.totalEarnings);
        }
      } catch (error) {
        console.error('加载用户数据失败:', error);
      }
    }
    loadUserData();
    loadBalance();
    loadSignStatus();
    loadExchangeRate();
  }, [user?.objectId, loadBalance, loadSignStatus, loadExchangeRate]);

  const handleDailySign = async () => {
    if (signed || signLoading) return;
    setSignLoading(true);
    try {
      const r = await incentiveApi.dailySign();
      if (r.success) {
        toast.success(`签到成功，获得 ${r.amount || 0} 积分${r.continuousDays ? `（连续 ${r.continuousDays} 天）` : ''}`);
        setSigned(true);
        setContinuousDays(Number(r.continuousDays || continuousDays + 1));
        await loadBalance();
      } else {
        toast.error(r.message || '签到失败');
        if (r.signed) setSigned(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '签到失败';
      toast.error(msg);
    } finally {
      setSignLoading(false);
    }
  };

  const openExchange = (direction: ExchangeDirection) => {
    if (!user?.web3Address) {
      toast.error('请先绑定 Web3 钱包');
      return;
    }
    setExchangeDirection(direction);
    setExchangeAmount('');
    setExchangeOpen(true);
  };

  const handleExchange = async () => {
    const amt = Number(exchangeAmount);
    if (!amt || amt <= 0) {
      toast.error('请输入有效金额');
      return;
    }
    setExchanging(true);
    try {
      if (exchangeDirection === 'to_web3') {
        if (!user?.web3Address) {
          toast.error('请先绑定 Web3 钱包');
          return;
        }
        const r = await incentiveApi.exchangeToWeb3(amt);
        if (r.success) {
          toast.success(`已兑换：${amt} 积分 → ${r.coins ?? 0} 金币`);
          setExchangeOpen(false);
          await loadBalance();
        } else {
          toast.error(r.message || '兑换失败');
        }
      } else {
        if (!user?.web3Address) {
          toast.error('请先绑定 Web3 钱包');
          return;
        }
        const r = await incentiveApi.exchangeToBalance(amt);
        if (r.success) {
          toast.success(`已兑换：${amt} 金币 → ${r.points ?? 0} 积分`);
          setExchangeOpen(false);
          await loadBalance();
        } else {
          toast.error(r.message || '兑换失败');
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '兑换失败';
      toast.error(msg);
    } finally {
      setExchanging(false);
    }
  };

  // 预览换算
  const previewAmount = (() => {
    const amt = Number(exchangeAmount);
    if (!amt || amt <= 0) return 0;
    if (exchangeDirection === 'to_web3') {
      // 积分 -> 金币：amt / points * coins
      if (!exchangeRate.points) return 0;
      return Number(((amt / exchangeRate.points) * exchangeRate.coins).toFixed(6));
    } else {
      // 金币 -> 积分：amt / coins * points
      if (!exchangeRate.coins) return 0;
      return Number(((amt / exchangeRate.coins) * exchangeRate.points).toFixed(2));
    }
  })();

  return (
    <div className="space-y-6">
      {/* 用户信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* 头像 */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || '/avatars/default.svg'} alt={user?.username} />
                  <AvatarFallback className="text-2xl">
                    {(user?.username || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* 用户信息 */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h2 className="text-2xl font-bold">{user?.username || 'User'}</h2>
                  {user?.memberLevel && user.memberLevel !== 'normal' && (
                    <>
                      <Badge variant="default">会员</Badge>
                      <Badge variant="secondary">{user.memberLevel.toUpperCase()}</Badge>
                    </>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">{user?.email || ''}</p>
                {user?.memberLevel && user.memberLevel !== 'normal' && user?.memberExpireAt && (
                  <p className="text-sm text-muted-foreground mt-1">
                    会员有效期至：{new Date(user.memberExpireAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* 右上角操作按钮 */}
              <div className="flex flex-col md:flex-row gap-2">
                <Button
                  variant={signed ? 'secondary' : 'default'}
                  onClick={handleDailySign}
                  disabled={signed || signLoading}
                >
                  {signLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
                  {signed ? `已签到（${continuousDays}天）` : '每日签到'}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/profile/settings">
                    <Edit className="h-4 w-4 mr-2" />
                    编辑资料
                  </Link>
                </Button>
              </div>
            </div>

            {/* 余额/统计 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {balanceLoading ? '...' : balance.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">账户积分</p>
              </div>
              {user?.web3Address && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-500">
                    {coinBalance == null ? '-' : coinBalance.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">链上金币</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{totalEarnings}</p>
                <p className="text-sm text-muted-foreground">累计收益</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.assetCount}</p>
                <p className="text-sm text-muted-foreground">我的资产</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.followerCount}</p>
                <p className="text-sm text-muted-foreground">粉丝数</p>
              </div>
            </div>

            {/* 兑换入口（仅绑定 Web3 后可见） */}
            {user?.web3Address ? (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => openExchange('to_web3')}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  积分 → 金币
                </Button>
                <Button variant="outline" size="sm" onClick={() => openExchange('to_balance')}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  金币 → 积分
                </Button>
                <div className="text-xs text-muted-foreground self-center ml-2">
                  兑换比例：{exchangeRate.points} 积分 = {exchangeRate.coins} 金币
                </div>
                <Button variant="ghost" size="sm" onClick={loadBalance} disabled={balanceLoading} className="ml-auto">
                  {balanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  <span className="ml-1">刷新</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
                <span>绑定 Web3 钱包后可在账户积分与链上金币之间兑换</span>
                <Button variant="ghost" size="sm" onClick={loadBalance} disabled={balanceLoading} className="ml-auto">
                  {balanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  <span className="ml-1">刷新</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 功能菜单 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              用户中心
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileMenus.map((menu, index) => (
                <motion.div
                  key={menu.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link href={menu.href}>
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <menu.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{menu.label}</h3>
                          <p className="text-sm text-muted-foreground">{menu.desc}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 最近活动 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="orders">订单</TabsTrigger>
                <TabsTrigger value="tasks">任务</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  暂无最近活动
                </div>
              </TabsContent>
              <TabsContent value="orders" className="space-y-4 mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  暂无订单记录
                </div>
              </TabsContent>
              <TabsContent value="tasks" className="space-y-4 mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  暂无任务记录
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* 兑换对话框 */}
      <Dialog open={exchangeOpen} onOpenChange={setExchangeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {exchangeDirection === 'to_web3' ? '账户积分兑换为链上金币' : '链上金币兑换为账户积分'}
            </DialogTitle>
            <DialogDescription>
              当前比例 {exchangeRate.points} 积分 = {exchangeRate.coins} 金币
              {exchangeDirection === 'to_web3'
                ? `；积分需为 ${exchangeRate.points} 的整数倍`
                : `；金币需为 ${exchangeRate.coins} 的整数倍`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>
                {exchangeDirection === 'to_web3' ? '消耗积分' : '消耗金币'}
              </Label>
              <Input
                type="number"
                min={0}
                step={exchangeDirection === 'to_web3' ? exchangeRate.points : exchangeRate.coins}
                value={exchangeAmount}
                onChange={(e) => setExchangeAmount(e.target.value)}
                placeholder={
                  exchangeDirection === 'to_web3'
                    ? `输入 ${exchangeRate.points} 的整数倍`
                    : `输入 ${exchangeRate.coins} 的整数倍`
                }
              />
            </div>
            <div className="text-sm text-muted-foreground">
              预计获得：
              <span className="text-foreground font-semibold ml-1">
                {previewAmount}
                {exchangeDirection === 'to_web3' ? ' 金币' : ' 积分'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              当前：{balance.toLocaleString()} 积分{coinBalance != null ? ` / ${coinBalance.toLocaleString()} 金币` : ''}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExchangeOpen(false)} disabled={exchanging}>
              取消
            </Button>
            <Button onClick={handleExchange} disabled={exchanging}>
              {exchanging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认兑换
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
