'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store';
import { ShareButton } from '@/components/share-dialog';
import { Gift, Copy, Users, CheckCircle, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyText } from '@/lib/utils';

export default function InvitePage() {
  const { user } = useAuthStore();
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://example.com'}/register?ref=${user?.objectId || 'demo'}`;
  const shareTitle = '我在巴特星球AIGC平台创作，邀请你一起来体验AI创作的魔力！';
  const shareDescription = '注册即送100金币，快来加入吧！';

  const handleCopy = async () => {
    const ok = await copyText(inviteLink);
    if (ok) toast.success('邀请链接已复制');
    else toast.error('复制失败，请手动复制');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">邀请有礼</h1>
        <p className="text-muted-foreground">
          邀请好友注册，双方均可获得金币奖励
        </p>
      </div>

      {/* 邀请统计 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邀请人数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.inviteCount || 0}</div>
            <p className="text-xs text-muted-foreground">累计邀请</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功注册</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.successRegCount || 0}</div>
            <p className="text-xs text-muted-foreground">成功注册用户</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计奖励</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.totalIncentive || 0}</div>
            <p className="text-xs text-muted-foreground">金币奖励</p>
          </CardContent>
        </Card>
      </div>

      {/* 邀请链接 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            我的邀请链接
          </CardTitle>
          <CardDescription>
            分享以下链接邀请好友注册
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="flex-1" />
            <Button onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              复制
            </Button>
          </div>
          <ShareButton
            platform="wechat"
            url={inviteLink}
            title={shareTitle}
            description={shareDescription}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* 活动规则 */}
      <Card>
        <CardHeader>
          <CardTitle>活动规则</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>1. 通过您的专属邀请链接注册的用户，即为您邀请的用户</li>
            <li>2. 被邀请用户成功注册并完成首次登录后，双方各获得100金币奖励</li>
            <li>3. 被邀请用户首次充值后，您将额外获得其充值金额10%的金币奖励</li>
            <li>4. 每日邀请奖励上限为1000金币</li>
            <li>5. 禁止使用任何作弊手段获取奖励，一经发现将取消所有奖励并封禁账号</li>
            <li>6. 活动最终解释权归平台所有</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
