'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore, useCartStore } from '@/store';
import { getUserNotifications } from '@/lib/parse-actions';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  User,
  Settings,
  CreditCard,
  ShoppingCart,
  Heart,
  Users,
  LogOut,
  Wallet,
  Crown,
  Shield,
  Megaphone,
  Search,
} from 'lucide-react';

export function Header() {
  const t = useTranslations();
  const { user, isAuthenticated, logout } = useAuthStore();
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // 确保客户端挂载后才获取购物车数量，避免水合错误
  useEffect(() => {
    setMounted(true);
    setCartItemCount(getTotalItems());
  }, [getTotalItems]);

  useEffect(() => {
    if (user?.objectId) {
      getUserNotifications(user.objectId, { unreadOnly: true, limit: 1 })
        .then(res => setUnreadCount(res.total || 0))
        .catch(err => {
          // Notification 表不存在时静默失败，不影响功能
          console.debug('[Notification] 查询失败:', err.message);
          setUnreadCount(0);
        });
    }
  }, [user?.objectId]);

  const handleLogout = async () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b bg-background px-4 md:px-6">
      {/* 搜索 */}
      <Link href="/market">
        <Button variant="ghost" size="icon">
          <Search className="h-5 w-5" />
        </Button>
      </Link>

      {/* 会员订阅 */}
      <Link href="/profile/membership">
        <Button variant="ghost" size="icon" className="relative">
          <Crown className="h-5 w-5 text-yellow-500" />
        </Button>
      </Link>

      {/* 购物车 */}
      <Link href="/cart">
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {mounted && cartItemCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </Badge>
          )}
        </Button>
      </Link>

      {/* 通知 */}
      <Link href="/profile/notifications">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </Link>

      {/* 主题切换 */}
      <ThemeToggle />

      {/* 用户菜单 */}
      {isAuthenticated && user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback>{user.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.username}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  {t('user.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('user.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/earnings">
                  <Wallet className="mr-2 h-4 w-4" />
                  {t('user.earnings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/orders">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t('user.orders')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t('user.recharge')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/favorites">
                  <Heart className="mr-2 h-4 w-4" />
                  {t('user.favorites')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/following">
                  <Users className="mr-2 h-4 w-4" />
                  {t('user.following')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* 管理入口 - 根据角色显示 */}
            {(user.role === 'admin' || user.role === 'operator') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        管理后台
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/operator">
                      <Megaphone className="mr-2 h-4 w-4" />
                      运营后台
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('user.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost">{t('user.login')}</Button>
          </Link>
          <Link href="/register">
            <Button>{t('user.register')}</Button>
          </Link>
        </div>
      )}
    </header>
  );
}
