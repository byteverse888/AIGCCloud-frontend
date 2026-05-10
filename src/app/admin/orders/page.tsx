'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { CopyableCell } from '@/components/admin/copyable-cell';

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  user?: string;
  username?: string;
  amount: number;
  status: string;
  type?: string;
  paymentMethod?: string;
  createdAt: string;
  productName?: string;
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  paid: 'default',
  completed: 'success',
  cancelled: 'secondary',
  refunded: 'destructive',
};

const statusLabels: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
};

export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [buyerUserIdInput, setBuyerUserIdInput] = useState('');
  const [buyerUserId, setBuyerUserId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (buyerUserId.trim()) params.buyerUserId = buyerUserId.trim();
      const res = await adminApi.listOrders(params);
      setOrders(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery, buyerUserId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 搜索防抖：重置到第一页
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, buyerUserId]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
        <p className="text-muted-foreground">查看和管理平台订单</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>订单列表</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索订单号..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="按购买者 userID 或 用户名 搜索..."
                  value={buyerUserIdInput}
                  onChange={(e) => setBuyerUserIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setBuyerUserId(buyerUserIdInput.trim());
                    }
                  }}
                  className="pl-10"
                />
              </div>
              {buyerUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBuyerUserIdInput('');
                    setBuyerUserId('');
                  }}
                >
                  清除用户
                </Button>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待支付</SelectItem>
                  <SelectItem value="paid">已支付</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                  <SelectItem value="refunded">已退款</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">暂无订单数据</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[180px]">订单号</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[130px]">用户</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[180px]">商品</th>
                      <th className="px-3 py-3 text-right text-xs font-medium whitespace-nowrap w-[90px]">金额</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">状态</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[100px]">支付方式</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[150px]">创建时间</th>
                      <th className="px-3 py-3 text-right text-xs font-medium whitespace-nowrap w-[80px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={order.orderNo} mono maxWidth="max-w-[160px]" />
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="flex flex-col gap-0.5">
                            <CopyableCell value={order.user || order.username || '-'} maxWidth="max-w-[110px]" />
                            <span
                              className="text-[11px] text-muted-foreground truncate max-w-[110px]"
                              title={order.userId}
                            >
                              {order.userId || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={order.productName || ''} maxWidth="max-w-[160px]" />
                        </td>
                        <td className="px-3 py-3 text-sm text-right font-bold whitespace-nowrap">¥{order.amount}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <Badge variant={statusColors[order.status] || 'default'}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">{order.paymentMethod || '-'}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-3 py-3 text-sm text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-1 h-4 w-4" />
                            详情
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
