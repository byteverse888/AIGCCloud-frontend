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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await adminApi.listOrders(params);
      setOrders(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 搜索防抖：重置到第一页
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

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
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">订单号</th>
                      <th className="p-3 text-left text-sm font-medium">用户</th>
                      <th className="p-3 text-left text-sm font-medium">商品</th>
                      <th className="p-3 text-left text-sm font-medium">金额</th>
                      <th className="p-3 text-left text-sm font-medium">状态</th>
                      <th className="p-3 text-left text-sm font-medium">支付方式</th>
                      <th className="p-3 text-left text-sm font-medium">创建时间</th>
                      <th className="p-3 text-left text-sm font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b">
                        <td className="p-3 text-sm font-mono">{order.orderNo}</td>
                        <td className="p-3 text-sm">{order.user || order.username || order.userId}</td>
                        <td className="p-3 text-sm">{order.productName || '-'}</td>
                        <td className="p-3 text-sm font-bold">¥{order.amount}</td>
                        <td className="p-3 text-sm">
                          <Badge variant={statusColors[order.status] || 'default'}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{order.paymentMethod || '-'}</td>
                        <td className="p-3 text-sm">
                          {new Date(order.createdAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="p-3 text-sm">
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
