'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpRight, ArrowDownRight, RotateCcw, Minus, Loader2, Search, Wallet, User } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface AccountRecord {
  id: string;
  userId: string;
  username: string;
  type: string;
  category: string;
  amount: number;
  balance: number;
  balance_before?: number;
  balance_after?: number;
  description: string;
  relatedOrderNo?: string;
  operatorId?: string;
  operatorName?: string;
  createdAt: string;
}

interface UserBalance {
  userId: string;
  username: string;
  email: string;
  role: string;
  level: number;
  memberLevel: string;
  coins: number;
  status: string;
  createdAt: string;
}

export default function OperatorAccountsPage() {
  // 资金流水
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordKw, setRecordKw] = useState('');

  // 概览
  const [summary, setSummary] = useState({ balance: 0, totalIncome: 0, totalExpense: 0 });

  // 用户余额
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [balancesTotal, setBalancesTotal] = useState(0);
  const [pageCoinsTotal, setPageCoinsTotal] = useState(0);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceKw, setBalanceKw] = useState('');
  const [balancesLoaded, setBalancesLoaded] = useState(false);

  const [tab, setTab] = useState<'records' | 'balances'>('records');

  // 加载资金流水
  const loadRecords = useCallback(async (kw: string) => {
    setRecordsLoading(true);
    try {
      const res = await adminApi.listAccountRecords({ limit: 50, userKw: kw || undefined });
      setRecords(res.records || []);
      setRecordsTotal(res.total || 0);
    } catch {
      toast.error('加载资金明细失败');
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  // 加载用户余额
  const loadBalances = useCallback(async (kw: string) => {
    setBalancesLoading(true);
    try {
      const res = await adminApi.listUserBalances({ limit: 50, keyword: kw || undefined });
      setBalances(res.data || []);
      setBalancesTotal(res.total || 0);
      setPageCoinsTotal(res.pageCoinsTotal || 0);
      setBalancesLoaded(true);
    } catch {
      toast.error('加载用户余额失败');
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初次：加载概览 + 资金流水
    (async () => {
      try {
        const sumRes = await adminApi.accountSummary();
        setSummary(sumRes);
      } catch {
        // 静默
      }
    })();
    loadRecords('');
  }, [loadRecords]);

  // 切到用户余额 Tab 时首次加载
  useEffect(() => {
    if (tab === 'balances' && !balancesLoaded) {
      loadBalances('');
    }
  }, [tab, balancesLoaded, loadBalances]);

  const getTypeConfig = (type: string) => {
    const map: Record<string, { label: string; color: string; icon: typeof ArrowUpRight }> = {
      income: { label: '收入', color: 'text-green-500', icon: ArrowUpRight },
      expense: { label: '支出', color: 'text-red-500', icon: ArrowDownRight },
      fee: { label: '手续费', color: 'text-orange-500', icon: Minus },
      refund: { label: '退款', color: 'text-yellow-500', icon: RotateCcw },
      recharge: { label: '充值', color: 'text-blue-500', icon: ArrowUpRight },
    };
    return map[type] || { label: type, color: 'text-gray-500', icon: Minus };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">账户明细</h2>
        <p className="text-muted-foreground">平台资金流水记录 + 所有用户余额</p>
      </div>

      {/* 资金概览 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm text-muted-foreground">当前余额</div>
            <div className="text-3xl font-bold">¥{summary.balance.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm text-muted-foreground">近期收入</div>
            <div className="text-3xl font-bold text-green-500">+¥{summary.totalIncome.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-sm text-muted-foreground">近期支出</div>
            <div className="text-3xl font-bold text-red-500">-¥{summary.totalExpense.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'records' | 'balances')} className="w-full">
        <TabsList>
          <TabsTrigger value="records"><Wallet className="h-4 w-4 mr-2" />资金流水</TabsTrigger>
          <TabsTrigger value="balances"><User className="h-4 w-4 mr-2" />用户余额</TabsTrigger>
        </TabsList>

        {/* 资金流水 */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">资金明细（共 {recordsTotal} 条）</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="按目标用户 userID 或 用户名 搜索..."
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setRecordKw(recordSearch);
                      loadRecords(recordSearch);
                    }
                  }}
                  className="w-72"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setRecordKw(recordSearch);
                    loadRecords(recordSearch);
                  }}
                >
                  <Search className="h-4 w-4 mr-1" />搜索
                </Button>
                {recordKw && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRecordSearch('');
                      setRecordKw('');
                      loadRecords('');
                    }}
                  >
                    清空
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : records.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无资金记录</p>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => {
                    const config = getTypeConfig(record.type);
                    const Icon = config.icon;
                    return (
                      <div
                        key={record.id}
                        className="flex items-start justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-full bg-muted ${config.color} shrink-0`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm break-all">{record.description}</div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                              <Badge variant="outline" className="text-xs">
                                {record.category || record.type}
                              </Badge>
                              {record.userId && (
                                <span>
                                  目标用户: <span className="text-foreground">{record.username || '-'}</span>{' '}
                                  <span className="font-mono">({record.userId})</span>
                                </span>
                              )}
                              {record.operatorName && (
                                <span>
                                  操作人: <span className="text-foreground">{record.operatorName}</span>
                                  {record.operatorId ? (
                                    <span className="font-mono"> ({record.operatorId})</span>
                                  ) : null}
                                </span>
                              )}
                              {record.relatedOrderNo && <span>单号: {record.relatedOrderNo}</span>}
                              <span>{record.createdAt}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className={`font-bold ${config.color}`}>
                            {record.amount > 0 ? '+' : ''}¥{record.amount}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            余额: ¥{(record.balance_after ?? record.balance ?? 0).toLocaleString()}
                          </div>
                          {typeof record.balance_before === 'number' && (
                            <div className="text-[11px] text-muted-foreground">
                              变动前: ¥{record.balance_before.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户余额 */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">
                用户余额（当前页 {balances.length} / 共 {balancesTotal} 人，本页合计 ¥
                {pageCoinsTotal.toLocaleString()}）
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="按 userID / 用户名 / 邮箱 搜索..."
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setBalanceKw(balanceSearch);
                      loadBalances(balanceSearch);
                    }
                  }}
                  className="w-72"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setBalanceKw(balanceSearch);
                    loadBalances(balanceSearch);
                  }}
                >
                  <Search className="h-4 w-4 mr-1" />搜索
                </Button>
                {balanceKw && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBalanceSearch('');
                      setBalanceKw('');
                      loadBalances('');
                    }}
                  >
                    清空
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : balances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无用户</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 px-3 font-medium">用户</th>
                        <th className="py-2 px-3 font-medium">邮箱</th>
                        <th className="py-2 px-3 font-medium">等级</th>
                        <th className="py-2 px-3 font-medium">会员</th>
                        <th className="py-2 px-3 font-medium">状态</th>
                        <th className="py-2 px-3 font-medium text-right">余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map((u) => (
                        <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 px-3">
                            <div className="font-medium">{u.username || '-'}</div>
                            <div className="text-xs text-muted-foreground font-mono">{u.userId}</div>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{u.email || '-'}</td>
                          <td className="py-2 px-3">Lv.{u.level ?? 1}</td>
                          <td className="py-2 px-3">
                            {u.memberLevel && u.memberLevel !== 'none' ? (
                              <Badge variant="secondary" className="text-xs">
                                {u.memberLevel}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant={u.status === 'active' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {u.status || 'active'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-bold">
                            ¥{u.coins.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
