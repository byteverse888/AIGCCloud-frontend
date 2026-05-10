'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Package, CheckCircle, Clock, Loader2, CreditCard, AlertCircle, XCircle, Copy, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store';
import { useCartStore } from '@/store';
import { getUserOrders, Order, verifyTransferAndCompleteOrder, cancelOrder } from '@/lib/parse-actions';
import { copyText } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: { label: '待支付', color: 'warning', icon: Clock },
  paid: { label: '支付中', color: 'info', icon: CreditCard },
  payment_failed: { label: '支付失败', color: 'destructive', icon: XCircle },
  completed: { label: '已完成', color: 'success', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'secondary', icon: AlertCircle },
  refunded: { label: '已退款', color: 'secondary', icon: Clock },
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  
  // txHash 详情对话框
  const [txHashDialogOpen, setTxHashDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 获取订单显示状态（如果有txHash且状态是pending，显示为支付中）
  const getDisplayStatus = (order: Order) => {
    if (order.txHash && order.status === 'pending') {
      return 'paid'; // 有txHash但状态是pending，显示为支付中
    }
    return order.status;
  };

  // 查看txHash详情
  const handleViewTxHash = (order: Order) => {
    setSelectedOrder(order);
    setTxHashDialogOpen(true);
  };

  // 复制txHash
  const copyTxHash = async (txHash: string) => {
    const ok = await copyText(txHash);
    if (ok) toast.success('已复制到剪贴板');
    else toast.error('复制失败，请手动复制');
  };

  // 格式化时间显示（包含日期和时分）
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 截取txHash显示
  const truncateTxHash = (hash: string) => {
    if (hash.length <= 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const handleVerifyTransfer = async (order: Order) => {
    const txHash = prompt('请输入转账交易Hash:');
    if (!txHash) return;
    
    setVerifyingOrderId(order.objectId);
    try {
      const result = await verifyTransferAndCompleteOrder(order.objectId, txHash);
      if (result.success) {
        toast.success('订单已完成！');
        // 同步刷新右上角购物车角标（后端已移除该商品）
        void useCartStore.getState().fetchCart();
        // 刷新订单列表
        const refreshResult = await getUserOrders(user!.objectId, { status: activeTab === 'all' ? undefined : activeTab, page, limit: pageSize });
        if (refreshResult.success) {
          setOrders(refreshResult.data);
          setTotal(refreshResult.total || 0);
        }
      } else {
        toast.error(result.error || '验证失败');
      }
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('确定要取消这个订单吗？')) return;
    const result = await cancelOrder(orderId);
    if (result.success) {
      toast.success('订单已取消');
      const refreshResult = await getUserOrders(user!.objectId, { status: activeTab === 'all' ? undefined : activeTab, page, limit: pageSize });
      if (refreshResult.success) {
        setOrders(refreshResult.data);
        setTotal(refreshResult.total || 0);
      }
    } else {
      toast.error('取消失败');
    }
  };

  useEffect(() => {
    async function loadOrders() {
      if (!user?.objectId) return;
      
      setLoading(true);
      try {
        const statusFilter = activeTab === 'all' ? undefined : activeTab;
        const result = await getUserOrders(user.objectId, { status: statusFilter, page, limit: pageSize });
        if (result.success) {
          console.log('[Orders] 加载订单数据:', result.data.map(o => ({ orderNo: o.orderNo, status: o.status, txHash: o.txHash })));
          setOrders(result.data);
          setTotal(result.total || 0);
        }
      } catch (error) {
        toast.error('加载订单失败');
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [user?.objectId, activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const totalPages = Math.ceil(total / pageSize);

  const renderOrderList = (_filterStatus?: string) => {
    // 服务端已按 activeTab 过滤，直接使用 orders
    const filteredOrders = orders;

    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          暂无{filterStatus ? statusConfig[filterStatus as keyof typeof statusConfig]?.label : ''}订单
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const displayStatus = getDisplayStatus(order);
          const status = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = status.icon;
          return (
            <Card key={order.objectId}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{order.productName || '订单'}</h3>
                      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">订单号：{order.orderNo}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-primary">¥{order.amount}</span>
                      <span className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</span>
                    </div>
                    {/* txHash 信息显示 */}
                    {order.txHash && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">txHash:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {truncateTxHash(order.txHash)}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {order.status === 'pending' && (
                    <>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleVerifyTransfer(order)}
                        disabled={verifyingOrderId === order.objectId}
                      >
                        {verifyingOrderId === order.objectId ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-1" />验证中...</>
                        ) : '确认转账'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCancelOrder(order.objectId)}>
                        取消订单
                      </Button>
                    </>
                  )}
                  {order.status === 'completed' && (
                    <Button variant="outline" size="sm">再次购买</Button>
                  )}
                  {order.txHash && (
                    <Button variant="ghost" size="sm" onClick={() => handleViewTxHash(order)}>
                      查看txHash
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // 获取txHash状态显示
  const getTxStatusDisplay = (order: Order) => {
    if (!order.txHash) return null;
    
    if (order.status === 'completed') {
      return { label: '已确认', color: 'bg-green-100 text-green-800' };
    } else if (order.status === 'payment_failed') {
      return { label: '失败', color: 'bg-red-100 text-red-800' };
    } else if (order.status === 'paid' || (order.txHash && order.status === 'pending')) {
      return { label: '待确认', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: '未知', color: 'bg-gray-100 text-gray-800' };
  };
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
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              我的订单
            </CardTitle>
            <CardDescription>查看和管理您的订单</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">全部订单</TabsTrigger>
                <TabsTrigger value="pending">待支付</TabsTrigger>
                <TabsTrigger value="paid">支付中</TabsTrigger>
                <TabsTrigger value="completed">已完成</TabsTrigger>
                <TabsTrigger value="payment_failed">支付失败</TabsTrigger>
                <TabsTrigger value="cancelled">已取消</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                {renderOrderList()}
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                {renderOrderList('pending')}
              </TabsContent>

              <TabsContent value="paid" className="mt-6">
                {renderOrderList('paid')}
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                {renderOrderList('completed')}
              </TabsContent>

              <TabsContent value="payment_failed" className="mt-6">
                {renderOrderList('payment_failed')}
              </TabsContent>

              <TabsContent value="cancelled" className="mt-6">
                {renderOrderList('cancelled')}
              </TabsContent>
            </Tabs>

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

      {/* txHash 详情对话框 */}
      <Dialog open={txHashDialogOpen} onOpenChange={setTxHashDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>交易详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && selectedOrder.txHash && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">订单号</label>
                <p className="text-sm">{selectedOrder.orderNo}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">交易Hash</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                    {selectedOrder.txHash}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyTxHash(selectedOrder.txHash!)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">交易状态</label>
                {(() => {
                  const txStatus = getTxStatusDisplay(selectedOrder);
                  return txStatus ? (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${txStatus.color}`}>
                        {txStatus.label}
                      </span>
                      {txStatus.label === '待确认' && (
                        <span className="text-xs text-muted-foreground">
                          交易已提交，等待区块链确认
                        </span>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">订单状态</label>
                <p className="text-sm">
                  {statusConfig[getDisplayStatus(selectedOrder) as keyof typeof statusConfig]?.label || '未知'}
                </p>
              </div>
              
              {selectedOrder.txHash.startsWith('0x') && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => window.open(`https://etherscan.io/tx/${selectedOrder.txHash}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  在区块链浏览器查看
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
