'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CopyableCell } from '@/components/admin/copyable-cell';

const actionLabels: Record<string, string> = {
  login: '登录',
  logout: '登出',
  create: '创建',
  update: '更新',
  delete: '删除',
  ban: '封禁',
  unban: '解封',
  reset_password: '重置密码',
  recharge: '充值',
  review: '审核',
};

const actionColors: Record<string, 'default' | 'success' | 'destructive' | 'outline'> = {
  login: 'success',
  logout: 'outline',
  create: 'success',
  update: 'default',
  delete: 'destructive',
  ban: 'destructive',
  unban: 'success',
  reset_password: 'default',
  recharge: 'default',
  review: 'default',
};

const moduleLabels: Record<string, string> = {
  auth: '认证',
  users: '用户',
  products: '商品',
  orders: '订单',
  system: '系统',
};

export interface OperationLogItem {
  objectId: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  action: string;
  module: string;
  targetClass: string;
  targetId: string;
  targetName: string;
  description: string;
  detail: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: string;
  errorMessage: string;
  createdAt: string;
}

export function OperationLogsView({ title, description }: { title: string; description: string }) {
  const [logs, setLogs] = useState<OperationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listOperationLogs({
        page,
        limit,
        action: actionFilter || undefined,
        module: moduleFilter || undefined,
        keyword: keyword || undefined,
      });
      setLogs(result.data);
      setTotal(result.total);
    } catch (e) {
      toast.error('加载操作日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, moduleFilter, keyword]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const applyKeyword = () => {
    setKeyword(keywordInput.trim());
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>日志列表</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                className="h-9 px-3 border rounded-md bg-background text-sm"
              >
                <option value="">全部模块</option>
                <option value="auth">认证</option>
                <option value="users">用户</option>
                <option value="products">商品</option>
                <option value="orders">订单</option>
                <option value="system">系统</option>
              </select>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="h-9 px-3 border rounded-md bg-background text-sm"
              >
                <option value="">全部操作</option>
                <option value="login">登录</option>
                <option value="logout">登出</option>
                <option value="create">创建</option>
                <option value="update">更新</option>
                <option value="delete">删除</option>
                <option value="ban">封禁</option>
                <option value="unban">解封</option>
                <option value="reset_password">重置密码</option>
                <option value="recharge">充值</option>
                <option value="review">审核</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="描述关键字..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyKeyword(); }}
                  className="pl-10 w-48"
                />
              </div>
              <Button variant="outline" size="sm" onClick={applyKeyword}>
                搜索
              </Button>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[150px]">时间</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[130px]">操作人</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[80px]">模块</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">操作</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[180px]">对象</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[240px]">描述</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[130px]">IP</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[70px]">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                          暂无日志记录
                        </td>
                      </tr>
                    )}
                    {logs.map((log) => (
                      <tr key={log.objectId} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={log.operatorName || ''} maxWidth="max-w-[110px]" />
                          <div className="text-xs text-muted-foreground">{log.operatorRole}</div>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">{moduleLabels[log.module] || log.module}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <Badge variant={actionColors[log.action] || 'default'}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={log.targetName || ''} maxWidth="max-w-[160px]" />
                          {log.targetId && (
                            <CopyableCell value={log.targetId} mono maxWidth="max-w-[160px]" className="text-xs text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="truncate max-w-[220px]" title={log.description}>{log.description || '-'}</div>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={log.ipAddress || ''} mono maxWidth="max-w-[110px]" />
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {log.status === 'success' ? (
                            <Badge variant="success">成功</Badge>
                          ) : (
                            <Badge variant="destructive" title={log.errorMessage}>失败</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">共 {total} 条记录</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <span className="flex items-center text-sm px-2">
                    {page} / {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
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
