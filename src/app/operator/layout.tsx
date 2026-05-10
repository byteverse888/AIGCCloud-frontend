'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import {
  LayoutDashboard,
  Package,
  Ticket,
  Megaphone,
  Wallet,
  FileSpreadsheet,
  BarChart3,
  Users,
  ClipboardList,
  Palette,
} from 'lucide-react';

const operatorNavItems = [
  { href: '/operator', icon: LayoutDashboard, label: '运营概览' },
  { href: '/operator/users', icon: Users, label: '用户管理' },
  { href: '/operator/products', icon: Package, label: '商品审批' },
  { href: '/operator/assets', icon: Palette, label: 'AI 资产' },
  { href: '/operator/tasks', icon: ClipboardList, label: '任务中心' },
  { href: '/operator/coupons', icon: Ticket, label: '券码管理' },
  { href: '/operator/promotions', icon: Megaphone, label: '促销管理' },
  { href: '/operator/recharge', icon: Wallet, label: '充值管理' },
  { href: '/operator/accounts', icon: FileSpreadsheet, label: '账户明细' },
  { href: '/operator/statistics', icon: BarChart3, label: '报表统计' },
  { href: '/operator/operation-logs', icon: ClipboardList, label: '操作日志' },
];

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell
      navItems={operatorNavItems}
      title="运营后台"
      icon={Megaphone}
      iconColor="bg-orange-500 text-white"
      allowedRoles={['operator', 'admin']}
      basePath="/operator"
    >
      {children}
    </AdminShell>
  );
}
