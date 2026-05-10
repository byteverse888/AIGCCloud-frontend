'use client';

import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SiteFooter } from '@/components/layout/footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Header />
        <main className="flex-1 p-6">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
