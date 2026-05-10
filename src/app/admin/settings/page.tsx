'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Save, CreditCard, Bell, Shield, Settings2, Image, Key, Coins, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';

type SettingsData = Record<string, Record<string, unknown>>;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await adminApi.getSettings();
      setSettings(res.data || {});
    } catch {
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const getValue = (category: string, key: string, defaultValue: string = '') => {
    return (settings[category]?.[key] as string) ?? defaultValue;
  };

  const getBool = (category: string, key: string, defaultValue: boolean = true) => {
    const val = settings[category]?.[key];
    return val !== undefined ? Boolean(val) : defaultValue;
  };

  const updateField = (category: string, key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...(prev[category] || {}), [key]: value },
    }));
  };

  const handleSave = async (category: string) => {
    setSaving(true);
    try {
      await adminApi.updateSettings(category, settings[category] || {});
      toast.success('设置已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
        <p className="text-muted-foreground">管理平台系统配置</p>
      </div>

      <Tabs defaultValue="payment">
        <TabsList className="flex-wrap">
          <TabsTrigger value="payment"><CreditCard className="mr-2 h-4 w-4" />支付设置</TabsTrigger>
          <TabsTrigger value="notification"><Bell className="mr-2 h-4 w-4" />通知设置</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />安全设置</TabsTrigger>
          <TabsTrigger value="general"><Settings2 className="mr-2 h-4 w-4" />通用设置</TabsTrigger>
          <TabsTrigger value="logo"><Image className="mr-2 h-4 w-4" />平台设置</TabsTrigger>
          <TabsTrigger value="license"><Key className="mr-2 h-4 w-4" />License</TabsTrigger>
          <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" />邮箱设置</TabsTrigger>
          <TabsTrigger value="credits"><Coins className="mr-2 h-4 w-4" />积分设置</TabsTrigger>
        </TabsList>

        {/* 支付设置 */}
        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>支付配置</CardTitle>
              <CardDescription>配置微信支付、支付宝等支付渠道</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-medium">微信支付</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>AppID</Label>
                    <Input value={getValue('payment', 'wechatAppId')} onChange={e => updateField('payment', 'wechatAppId', e.target.value)} placeholder="wx1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label>商户号</Label>
                    <Input value={getValue('payment', 'wechatMchId')} onChange={e => updateField('payment', 'wechatMchId', e.target.value)} placeholder="1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label>API密钥</Label>
                    <Input type="password" value={getValue('payment', 'wechatApiKey')} onChange={e => updateField('payment', 'wechatApiKey', e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>回调地址</Label>
                    <Input value={getValue('payment', 'wechatNotifyUrl')} onChange={e => updateField('payment', 'wechatNotifyUrl', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-medium">支付宝</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>AppID</Label>
                    <Input value={getValue('payment', 'alipayAppId')} onChange={e => updateField('payment', 'alipayAppId', e.target.value)} placeholder="2021001234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label>应用私钥</Label>
                    <Input type="password" value={getValue('payment', 'alipayPrivateKey')} onChange={e => updateField('payment', 'alipayPrivateKey', e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
              </div>
              <Button onClick={() => handleSave('payment')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notification" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>通知配置</CardTitle>
              <CardDescription>配置邮件、短信等通知渠道</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">新用户注册通知</p><p className="text-sm text-muted-foreground">新用户注册时发送邮件通知</p></div>
                  <Switch checked={getBool('notification', 'newUserNotify')} onCheckedChange={v => updateField('notification', 'newUserNotify', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">订单通知</p><p className="text-sm text-muted-foreground">订单状态变更时发送通知</p></div>
                  <Switch checked={getBool('notification', 'orderNotify')} onCheckedChange={v => updateField('notification', 'orderNotify', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">商品审核通知</p><p className="text-sm text-muted-foreground">商品审核结果通知创作者</p></div>
                  <Switch checked={getBool('notification', 'auditNotify')} onCheckedChange={v => updateField('notification', 'auditNotify', v)} />
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-medium">邮件服务配置</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP服务器</Label>
                    <Input value={getValue('notification', 'smtpHost')} onChange={e => updateField('notification', 'smtpHost', e.target.value)} placeholder="smtp.example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>端口</Label>
                    <Input value={getValue('notification', 'smtpPort')} onChange={e => updateField('notification', 'smtpPort', e.target.value)} placeholder="465" />
                  </div>
                  <div className="space-y-2">
                    <Label>用户名</Label>
                    <Input value={getValue('notification', 'smtpUser')} onChange={e => updateField('notification', 'smtpUser', e.target.value)} placeholder="noreply@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>密码</Label>
                    <Input type="password" value={getValue('notification', 'smtpPass')} onChange={e => updateField('notification', 'smtpPass', e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
              </div>
              <Button onClick={() => handleSave('notification')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>安全配置</CardTitle>
              <CardDescription>配置平台安全相关设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">强制HTTPS</p><p className="text-sm text-muted-foreground">强制所有请求使用HTTPS</p></div>
                  <Switch checked={getBool('security', 'forceHttps')} onCheckedChange={v => updateField('security', 'forceHttps', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">登录验证码</p><p className="text-sm text-muted-foreground">登录时需要输入图形验证码</p></div>
                  <Switch checked={getBool('security', 'loginCaptcha')} onCheckedChange={v => updateField('security', 'loginCaptcha', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">敏感操作二次验证</p><p className="text-sm text-muted-foreground">支付等敏感操作需要二次验证</p></div>
                  <Switch checked={getBool('security', 'twoFactorAuth')} onCheckedChange={v => updateField('security', 'twoFactorAuth', v)} />
                </div>
              </div>
              <Button onClick={() => handleSave('security')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通用设置 */}
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>通用配置</CardTitle>
              <CardDescription>配置平台基础信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>平台名称</Label>
                  <Input value={getValue('general', 'siteName', '巴特星球')} onChange={e => updateField('general', 'siteName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>平台地址</Label>
                  <Input value={getValue('general', 'siteUrl')} onChange={e => updateField('general', 'siteUrl', e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>联系邮箱</Label>
                  <Input value={getValue('general', 'contactEmail')} onChange={e => updateField('general', 'contactEmail', e.target.value)} placeholder="contact@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>ICP备案号</Label>
                  <Input value={getValue('general', 'icp')} onChange={e => updateField('general', 'icp', e.target.value)} placeholder="京ICP备xxxxxxxx号" />
                </div>
              </div>
              <Button onClick={() => handleSave('general')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 平台设置（Logo / 品牌 / 页脚 / 备案） */}
        <TabsContent value="logo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>平台设置</CardTitle>
              <CardDescription>配置平台品牌标识、产品名称、页脚与备案信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-medium">品牌标识</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>产品名称（左上角显示）</Label>
                    <Input value={getValue('logo', 'productName', '巴特星球')} onChange={e => updateField('logo', 'productName', e.target.value)} placeholder="巴特星球" />
                    <p className="text-xs text-muted-foreground">主站侧栏、管理后台、运营后台左上角的显示名称</p>
                  </div>
                  <div className="space-y-2">
                    <Label>网站标题 slogan（可选）</Label>
                    <Input value={getValue('logo', 'slogan')} onChange={e => updateField('logo', 'slogan', e.target.value)} placeholder="如：下一代 AI 创作平台" />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-medium">Logo 与图片</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>主Logo URL（浅色模式）</Label>
                    <Input value={getValue('logo', 'lightLogo')} onChange={e => updateField('logo', 'lightLogo', e.target.value)} placeholder="https://..." />
                    {getValue('logo', 'lightLogo') && <img src={getValue('logo', 'lightLogo')} alt="light logo" className="h-12 mt-2 object-contain" />}
                  </div>
                  <div className="space-y-2">
                    <Label>主Logo URL（深色模式）</Label>
                    <Input value={getValue('logo', 'darkLogo')} onChange={e => updateField('logo', 'darkLogo', e.target.value)} placeholder="https://..." />
                    {getValue('logo', 'darkLogo') && <img src={getValue('logo', 'darkLogo')} alt="dark logo" className="h-12 mt-2 object-contain" />}
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon URL</Label>
                    <Input value={getValue('logo', 'favicon')} onChange={e => updateField('logo', 'favicon', e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>登录页背景图 URL</Label>
                    <Input value={getValue('logo', 'loginBg')} onChange={e => updateField('logo', 'loginBg', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-medium">联系方式</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>客服电话</Label>
                    <Input value={getValue('logo', 'contactPhone')} onChange={e => updateField('logo', 'contactPhone', e.target.value)} placeholder="400-xxx-xxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>客服邮箱</Label>
                    <Input value={getValue('logo', 'supportEmail')} onChange={e => updateField('logo', 'supportEmail', e.target.value)} placeholder="support@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>公司地址</Label>
                    <Input value={getValue('logo', 'companyAddress')} onChange={e => updateField('logo', 'companyAddress', e.target.value)} placeholder="如：北京市..." />
                  </div>
                  <div className="space-y-2">
                    <Label>公司全称</Label>
                    <Input value={getValue('logo', 'companyName')} onChange={e => updateField('logo', 'companyName', e.target.value)} placeholder="XX 科技有限公司" />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-medium">备案信息</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>ICP 备案号</Label>
                    <Input value={getValue('logo', 'icp') || getValue('general', 'icp')} onChange={e => updateField('logo', 'icp', e.target.value)} placeholder="京ICP备xxxxxxxx号" />
                    <p className="text-xs text-muted-foreground">显示于页脚，如同时在“通用设置”配置将以本处为优先</p>
                  </div>
                  <div className="space-y-2">
                    <Label>公安备案号</Label>
                    <Input value={getValue('logo', 'policeICP')} onChange={e => updateField('logo', 'policeICP', e.target.value)} placeholder="京公网安备 110xxxxxxxxxxx 号" />
                  </div>
                  <div className="space-y-2">
                    <Label>经营许可证</Label>
                    <Input value={getValue('logo', 'businessLicense')} onChange={e => updateField('logo', 'businessLicense', e.target.value)} placeholder="如：增值电信业务经营许可证号" />
                  </div>
                  <div className="space-y-2">
                    <Label>影视由 / 网文证等其他资质</Label>
                    <Input value={getValue('logo', 'otherLicense')} onChange={e => updateField('logo', 'otherLicense', e.target.value)} placeholder="可选填写" />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-medium">页脚信息</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>版权声明</Label>
                    <Input value={getValue('logo', 'footerCopyright')} onChange={e => updateField('logo', 'footerCopyright', e.target.value)} placeholder="© 2025 巴特星球. All Rights Reserved." />
                  </div>
                  <div className="space-y-2">
                    <Label>页脚追加文案（可选）</Label>
                    <Input value={getValue('logo', 'footerText')} onChange={e => updateField('logo', 'footerText', e.target.value)} placeholder="如：本网站由 XX 提供技术支持" />
                  </div>
                  <div className="space-y-2">
                    <Label>友情链接（JSON 数组，可选）</Label>
                    <Input value={getValue('logo', 'friendLinks')} onChange={e => updateField('logo', 'friendLinks', e.target.value)} placeholder='[{"name":"官网","url":"https://..."}]' />
                  </div>
                </div>
              </div>
              <Button onClick={() => handleSave('logo')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* License */}
        <TabsContent value="license" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>License 管理</CardTitle>
              <CardDescription>管理平台授权许可</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-300">已授权</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">有效期至: {getValue('license', 'expiresAt', '2025-12-31')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>授权码</Label>
                  <Input value={getValue('license', 'licenseKey')} onChange={e => updateField('license', 'licenseKey', e.target.value)} placeholder="输入License Key" />
                </div>
                <div className="space-y-2">
                  <Label>授权单位</Label>
                  <Input value={getValue('license', 'org', '巴特星球')} disabled />
                </div>
                <div className="space-y-2">
                  <Label>最大用户数</Label>
                  <Input value={getValue('license', 'maxUsers', '10000')} disabled />
                </div>
                <div className="space-y-2">
                  <Label>已用用户数</Label>
                  <Input value={getValue('license', 'usedUsers', '0')} disabled />
                </div>
              </div>
              <Button onClick={() => handleSave('license')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                激活/更新 License
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 邮箱设置 */}
        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>邮箱服务设置</CardTitle>
              <CardDescription>配置系统邮件发送服务</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>邮件服务商</Label>
                  <Input value={getValue('email', 'provider', 'SMTP')} onChange={e => updateField('email', 'provider', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP服务器</Label>
                  <Input value={getValue('email', 'host')} onChange={e => updateField('email', 'host', e.target.value)} placeholder="smtp.example.com" />
                </div>
                <div className="space-y-2">
                  <Label>端口</Label>
                  <Input value={getValue('email', 'port')} onChange={e => updateField('email', 'port', e.target.value)} placeholder="465" />
                </div>
                <div className="space-y-2">
                  <Label>加密方式</Label>
                  <Input value={getValue('email', 'secure', 'SSL/TLS')} onChange={e => updateField('email', 'secure', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>发件人邮箱</Label>
                  <Input value={getValue('email', 'user')} onChange={e => updateField('email', 'user', e.target.value)} placeholder="noreply@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>授权码/密码</Label>
                  <Input type="password" value={getValue('email', 'pass')} onChange={e => updateField('email', 'pass', e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>发件人名称</Label>
                  <Input value={getValue('email', 'senderName', '巴特星球')} onChange={e => updateField('email', 'senderName', e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast.success('测试邮件已发送')}>发送测试邮件</Button>
                <Button onClick={() => handleSave('email')} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 积分设置 */}
        <TabsContent value="credits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>积分设置</CardTitle>
              <CardDescription>配置用户积分获取和消耗规则</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-medium">积分获取规则</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium">每日签到</p><p className="text-sm text-muted-foreground">每天签到获得积分</p></div>
                    <Input className="w-20" value={getValue('credits', 'dailyCheckin', '5')} onChange={e => updateField('credits', 'dailyCheckin', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium">邀请注册</p><p className="text-sm text-muted-foreground">邀请新用户注册获得积分</p></div>
                    <Input className="w-20" value={getValue('credits', 'inviteRegister', '50')} onChange={e => updateField('credits', 'inviteRegister', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium">购买商品</p><p className="text-sm text-muted-foreground">消费1元=N积分</p></div>
                    <Input className="w-20" value={getValue('credits', 'purchaseRatio', '1')} onChange={e => updateField('credits', 'purchaseRatio', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium">发布作品</p><p className="text-sm text-muted-foreground">发布作品审核通过获得积分</p></div>
                    <Input className="w-20" value={getValue('credits', 'publishProduct', '20')} onChange={e => updateField('credits', 'publishProduct', e.target.value)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-medium">积分兑换比例</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>积分抵扣比例</Label>
                    <div className="flex items-center gap-2">
                      <Input className="w-20" value={getValue('credits', 'exchangePoints', '100')} onChange={e => updateField('credits', 'exchangePoints', e.target.value)} />
                      <span className="text-sm">积分 = ¥</span>
                      <Input className="w-20" value={getValue('credits', 'exchangeYuan', '1')} onChange={e => updateField('credits', 'exchangeYuan', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>单笔最大抵扣</Label>
                    <div className="flex items-center gap-2">
                      <Input className="w-20" value={getValue('credits', 'maxDeductPercent', '50')} onChange={e => updateField('credits', 'maxDeductPercent', e.target.value)} />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={() => handleSave('credits')} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
