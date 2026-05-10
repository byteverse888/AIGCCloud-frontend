'use client';

import { useState, Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store';
import { loginUser } from '@/lib/parse-actions';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Mail, Smartphone, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名/手机号/邮箱'),
  password: z.string().min(6, '密码至少6位'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'password');

  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleSetUser = (user: any, jwtToken?: string) => {
    const parseSessionToken = user.sessionToken;
    setUser({
      objectId: user.objectId,
      sessionToken: parseSessionToken,
      jwtToken: jwtToken,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role || 'user',
      level: user.level || 1,
      memberLevel: user.memberLevel || 'normal',
      memberExpireAt: user.memberExpireAt,
      inviteCount: user.inviteCount || 0,
      successRegCount: user.successRegCount || 0,
      totalIncentive: user.totalIncentive || 0,
      avatar: user.avatar,
      avatarKey: user.avatarKey,
      web3Address: user.web3Address,
    });
  };

  const getRedirectPath = (role: string): string => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'operator':
        return '/operator';
      default:
        return '/';
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const isEmail = emailRegex.test(data.username);
      
      if (isEmail) {
        const emailResult = await authApi.emailLogin(data.username, data.password);
        if (emailResult.success && emailResult.user) {
          handleSetUser(emailResult.user, emailResult.token);
          toast.success('登录成功');
          router.push(getRedirectPath(emailResult.user.role));
          return;
        }
      } else {
        const result = await loginUser(data.username, data.password);
        if (result.success && result.user) {
          let finalUser = result.user;
          try {
            const backendLogin = await authApi.login(data.username, data.password);
            if (backendLogin.success && backendLogin.token) {
              finalUser = { ...result.user, ...backendLogin.user };
              handleSetUser(finalUser, backendLogin.token);
            } else {
              handleSetUser(finalUser);
            }
          } catch {
            handleSetUser(finalUser);
          }
          toast.success('登录成功');
          router.push(getRedirectPath(finalUser.role));
        } else {
          toast.error(result.error || '登录失败');
        }
      }
    } catch (error) {
      toast.error((error as Error).message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入有效的手机号');
      return;
    }
    if (!phoneCode) {
      toast.error('请输入验证码');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.phoneLogin(phone, phoneCode);
      if (result.success && result.user) {
        handleSetUser(result.user, result.token);
        toast.success('登录成功');
        router.push(getRedirectPath(result.user.role));
      } else {
        toast.error('登录失败');
      }
    } catch (error) {
      toast.error((error as Error).message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSms = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入有效的手机号');
      return;
    }

    setPhoneSending(true);
    try {
      await authApi.sendSms(phone, 'login');
      toast.success('验证码已发送');
      setPhoneCountdown(60);
      const timer = setInterval(() => {
        setPhoneCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error((error as Error).message || '发送失败');
    } finally {
      setPhoneSending(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">巴特星球</CardTitle>
          <CardDescription>登录您的账户</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">
                <Mail className="mr-2 h-4 w-4" />
                账号登录
              </TabsTrigger>
              <TabsTrigger value="phone">
                <Smartphone className="mr-2 h-4 w-4" />
                手机登录
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名/邮箱</Label>
                  <Input
                    id="username"
                    placeholder="请输入用户名或邮箱"
                    autoComplete="email"
                    {...register('username')}
                    disabled={isLoading}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    {...register('password')}
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Link href="/forgot-password" className="text-primary hover:underline">
                    忘记密码？
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />登录中...</> : '登录'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>手机号</Label>
                  <Input
                    placeholder="请输入手机号"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="验证码"
                    className="flex-1"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    disabled={phoneSending || phoneCountdown > 0 || !phone || phone.length !== 11}
                    onClick={handleSendSms}
                  >
                    {phoneCountdown > 0 ? `${phoneCountdown}s` : '获取验证码'}
                  </Button>
                </div>
                <Button className="w-full" disabled={isLoading || !phone || !phoneCode} onClick={handlePhoneLogin}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />登录中...</> : '登录'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            还没有账号？{' '}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            登录即表示您同意{' '}
            <Link href="/more/user-agreement" className="text-primary hover:underline">用户协议</Link>
            {' '}和{' '}
            <Link href="/more/privacy-policy" className="text-primary hover:underline">隐私政策</Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}