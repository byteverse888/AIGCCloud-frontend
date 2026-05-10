'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { Sparkles, LogOut, ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface AdminShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
  icon: LucideIcon;
  iconColor?: string; // Tailwind bg class, e.g. "bg-primary" or "bg-orange-500"
  allowedRoles: string[];
  basePath: string; // e.g. "/admin" or "/operator"
}

export function AdminShell({
  children,
  navItems,
  title,
  icon: BrandIcon,
  iconColor = 'bg-primary text-primary-foreground',
  allowedRoles,
  basePath,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const publicConfig = usePublicConfig();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !allowedRoles.includes(user?.role || ''))) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Sparkles className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !allowedRoles.includes(user?.role || '')) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === basePath) return pathname === basePath;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 侧边栏 */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-background">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href={basePath} className="flex items-center gap-2">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconColor)}>
              <BrandIcon className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">{publicConfig.productName || publicConfig.siteName || '巴特星球'}</span>
              <span className="text-xs text-muted-foreground">{title}</span>
            </div>
          </Link>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={active ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-3"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />
        <div className="p-2 space-y-1">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <ChevronLeft className="h-5 w-5" />
              返回用户端
            </Button>
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="ml-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b bg-background px-6">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.username}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                useAuthStore.getState().logout();
                router.push('/login');
              }}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
