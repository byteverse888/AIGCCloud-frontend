'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Copy, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { copyText } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minAmount?: number;
  scope: string;
  scopeDetail?: string;
  startDate: string;
  endDate: string;
  totalCount: number;
  usedCount: number;
  status: string;
  createdAt: string;
}

export default function OperatorCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'fixed', value: '', minAmount: '', startDate: '', endDate: '', totalCount: '1000' });

  const loadCoupons = async () => {
    try {
      const res = await adminApi.listCoupons();
      setCoupons(res.coupons || []);
    } catch {
      toast.error('加载券码失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCoupons(); }, []);

  const handleCreate = async () => {
    if (!form.code || !form.value) { toast.error('请填写券码和面值'); return; }
    try {
      await adminApi.createCoupon({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        min_amount: form.minAmount ? Number(form.minAmount) : undefined,
        start_date: form.startDate,
        end_date: form.endDate,
        total_count: Number(form.totalCount) || 1000,
      });
      toast.success('创建成功');
      setDialogOpen(false);
      setForm({ code: '', type: 'fixed', value: '', minAmount: '', startDate: '', endDate: '', totalCount: '1000' });
      loadCoupons();
    } catch {
      toast.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteCoupon(id);
      toast.success('已删除');
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch {
      toast.error('删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, React.ReactNode> = {
      active: <Badge className="bg-green-500">生效中</Badge>,
      expired: <Badge variant="secondary">已过期</Badge>,
      disabled: <Badge variant="destructive">已禁用</Badge>,
    };
    return map[status] || <Badge variant="secondary">{status}</Badge>;
  };

  const getTypeLabel = (type: string, value: number, minAmount?: number) => {
    if (type === 'fixed') return `立减¥${value}`;
    if (type === 'percent') return `${value}%折扣`;
    return `满¥${minAmount}减¥${value}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">券码管理</h2>
          <p className="text-muted-foreground">管理优惠券和兑换码</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />创建券码</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>创建优惠券</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>券码</Label>
                <Input placeholder="输入券码，如 NEW2024" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Input placeholder="fixed/percent/threshold" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>面值</Label>
                  <Input type="number" placeholder="10" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>发放数量</Label>
                <Input type="number" placeholder="1000" value={form.totalCount} onChange={e => setForm(f => ({ ...f, totalCount: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleCreate}>创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {coupons.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">暂无券码</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {coupons.map(coupon => (
            <Card key={coupon.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <code className="px-2 py-1 rounded bg-muted font-mono text-sm">{coupon.code}</code>
                      <Button variant="ghost" size="sm" onClick={async () => { const ok = await copyText(coupon.code); if (ok) toast.success('已复制'); else toast.error('复制失败，请手动复制'); }}><Copy className="h-3 w-3" /></Button>
                      {getStatusBadge(coupon.status)}
                    </div>
                    <div className="text-lg font-bold">{getTypeLabel(coupon.type, coupon.value, coupon.minAmount)}</div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>适用: {coupon.scope === 'all' ? '全场' : coupon.scopeDetail || coupon.scope}</span>
                      <span>有效期: {coupon.startDate} ~ {coupon.endDate}</span>
                      <span>已用/总量: {coupon.usedCount}/{coupon.totalCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="text-sm text-muted-foreground">使用率</div>
                      <div className="font-bold">{((coupon.usedCount / (coupon.totalCount || 1)) * 100).toFixed(1)}%</div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(coupon.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
