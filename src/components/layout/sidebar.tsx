'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import {
  Home,
  Sparkles,
  Package,
  ShoppingBag,
  Gift,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Image,
  Music,
  Music2,
  Video,
  Mic,
  Bot,
  Palette,
  Workflow,
  ListTodo,
  FileText,
  Shield,
  HelpCircle,
  Users,
  Info,
  BookImage,
} from 'lucide-react';

const mainNavItems = [
  { href: '/', icon: Home, labelKey: 'nav.home' },
  {
    href: '/ai-creator',
    icon: Sparkles,
    labelKey: 'nav.aiCreator',
    children: [
      { href: '/ai-creator/text-to-image', icon: Image, labelKey: 'aiCreator.textToImage' },
      { href: '/ai-creator/text-to-speech', icon: Mic, labelKey: 'aiCreator.textToSpeech' },
      { href: '/ai-creator/text-to-music', icon: Music, labelKey: 'aiCreator.textToMusic' },
      { href: '/ai-creator/text-to-video', icon: Video, labelKey: 'aiCreator.textToVideo' },
      { href: '/ai-creator/digital-human', icon: Bot, labelKey: 'aiCreator.digitalHuman' },
      { href: '/ai-creator/webui', icon: Palette, labelKey: 'aiCreator.webui' },
      { href: '/ai-creator/comfyui', icon: Workflow, labelKey: 'aiCreator.comfyui' },
    ],
  },
  { href: '/tasks', icon: ListTodo, labelKey: 'nav.aiTasks' },
  { href: '/assets', icon: Package, labelKey: 'nav.aiAssets' },
  { href: '/market', icon: ShoppingBag, labelKey: 'nav.aiMarket' },
  { href: '/invite', icon: Gift, labelKey: 'nav.invite' },
  {
    href: '/more',
    icon: MoreHorizontal,
    labelKey: 'nav.more',
    children: [
      { href: '/more/user-agreement', icon: FileText, labelKey: 'more.userAgreement' },
      { href: '/more/privacy-policy', icon: Shield, labelKey: 'more.privacyPolicy' },
      { href: '/more/faq', icon: HelpCircle, labelKey: 'more.faq' },
      { href: '/more/join-us', icon: Users, labelKey: 'more.joinUs' },
      { href: '/more/about', icon: Info, labelKey: 'more.about' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const publicConfig = usePublicConfig();

  // 管理展开的菜单项
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    // 对于带query参数的链接，只比较路径部分
    const basePath = href.split('?')[0];
    return pathname.startsWith(basePath);
  };

  // 当路由匹配时自动展开对应的父菜单
  useEffect(() => {
    mainNavItems.forEach((item) => {
      if (item.children && isActive(item.href)) {
        setExpandedMenus((prev) => {
          const next = new Set(prev);
          next.add(item.href);
          return next;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpand = (href: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const isChildActive = (childHref: string) => {
    // 对于带 query 参数的子菜单，检查当前 URL 是否匹配
    if (childHref.includes('?')) {
      const url = new URL(childHref, 'http://localhost');
      const childPath = url.pathname;
      const childCategory = url.searchParams.get('category');
      if (pathname === childPath && typeof window !== 'undefined') {
        const currentParams = new URLSearchParams(window.location.search);
        return currentParams.get('category') === childCategory;
      }
      return false;
    }
    return pathname === childHref;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-background transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo区域 */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">{publicConfig.productName || publicConfig.siteName || '巴特星球'}</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* 导航区域 */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasChildren = !!item.children;
              const isExpanded = expandedMenus.has(item.href);

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>
                        <Button
                          variant={active ? 'secondary' : 'ghost'}
                          size="icon"
                          className="w-full"
                        >
                          <Icon className="h-5 w-5" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {t(item.labelKey)}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={item.href}>
                  {hasChildren ? (
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3"
                      onClick={() => toggleExpand(item.href)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="flex-1 text-left">{t(item.labelKey)}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <Link href={item.href}>
                      <Button
                        variant={active ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-3"
                      >
                        <Icon className="h-5 w-5" />
                        {t(item.labelKey)}
                      </Button>
                    </Link>
                  )}
                  {hasChildren && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isChildActive(child.href);
                        return (
                          <Link key={child.href} href={child.href}>
                            <Button
                              variant={childActive ? 'secondary' : 'ghost'}
                              size="sm"
                              className="w-full justify-start gap-2"
                            >
                              <ChildIcon className="h-4 w-4" />
                              {t(child.labelKey)}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* 折叠按钮 */}
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
