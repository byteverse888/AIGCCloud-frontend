'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, ArrowLeft, CheckCircle, Info, AlertTriangle, Gift, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store';
import { getUserNotifications, markAllNotificationsRead, Notification } from '@/lib/parse-actions';
import Link from 'next/link';
import toast from 'react-hot-toast';

// 模拟通知数据
const notifications = [
  {
    id: '1',
    type: 'success',
    title: '商品审核通过',
    content: '您的商品"AI艺术画作 - 星空幻想"已通过审核，现已上架销售。',
    date: '2026-01-03 14:30',
    read: false,
  },
  {
    id: '2',
    type: 'reward',
    title: '获得创作激励',
    content: '恭喜您获得100金币的创作激励奖励！',
    date: '2026-01-02 10:15',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: '系统维护通知',
    content: '系统将于2026年1月5日凌晨2:00-4:00进行维护升级，届时部分功能可能暂时不可用。',
    date: '2026-01-01 18:00',
    read: true,
  },
  {
    id: '4',
    type: 'warning',
    title: '商品审核未通过',
    content: '您的商品"测试商品"审核未通过，原因：描述不完整。请修改后重新提交。',
    date: '2025-12-30 09:45',
    read: true,
  },
];

const iconMap = {
  success: CheckCircle,
  reward: Gift,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'text-green-500',
  reward: 'text-yellow-500',
  info: 'text-blue-500',
  warning: 'text-orange-500',
  system: 'text-gray-500',
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    async function loadNotifications() {
      if (!user?.objectId) return;
      
      setLoading(true);
      try {
        const result = await getUserNotifications(user.objectId, { page, limit: pageSize });
        if (result.success) {
          setNotifications(result.data);
          setTotal(result.total || 0);
        }
      } catch (error) {
        toast.error('加载通知失败');
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, [user?.objectId, page]);

  const totalPages = Math.ceil(total / pageSize);

  const handleMarkAllRead = async () => {
    if (!user?.objectId) return;
    
    try {
      const result = await markAllNotificationsRead(user.objectId);
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('已全部标记为已读');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  消息中心
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount}</Badge>
                  )}
                </CardTitle>
                <CardDescription>查看系统通知和消息</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0}>全部已读</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => {
                  const Icon = iconMap[notification.type as keyof typeof iconMap] || Info;
                  const colorClass = colorMap[notification.type as keyof typeof colorMap] || 'text-gray-500';
                  return (
                    <div
                      key={notification.objectId}
                      className={`p-4 border rounded-lg ${!notification.read ? 'bg-accent/50' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{notification.title}</h3>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">未读</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notification.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {notifications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无消息
                  </div>
                )}
              </div>
            )}

            {!loading && total > 0 && (
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
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
