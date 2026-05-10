'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CopyableCell } from '@/components/admin/copyable-cell';

interface TaskRow {
  objectId: string;
  task_id: string;
  type: string;
  model: string;
  status: number;
  designer: string;
  username: string;
  errorMessage?: string;
  created_at: string;
  updated_at?: string;
}

const statusLabels: Record<number, string> = {
  0: '排队中',
  1: '处理中',
  2: '已完成',
  3: '失败',
  4: '已结算',
};

const statusColors: Record<number, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  0: 'warning',
  1: 'default',
  2: 'success',
  3: 'destructive',
  4: 'success',
};

const typeLabels: Record<string, string> = {
  txt2img: '文生图',
  img2img: '图生图',
  txt2speech: '文生语音',
  speech2txt: '语音转文字',
  txt2music: '文生音乐',
  txt2video: '文生视频',
};

interface TasksViewProps {
  title?: string;
  subtitle?: string;
}

export function TasksView({ title = '任务中心', subtitle = '查看全平台的 AI 生成任务' }: TasksViewProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [designerInput, setDesignerInput] = useState('');
  const [designer, setDesigner] = useState('');
  const pageSize = 20;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; status?: number; type?: string; designer?: string } = {
        page,
        limit: pageSize,
      };
      if (statusFilter !== 'all') params.status = Number(statusFilter);
      if (typeFilter !== 'all') params.type = typeFilter;
      if (designer.trim()) params.designer = designer.trim();
      const res = await adminApi.listTasks(params);
      setTasks(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      toast.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, designer]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, designer]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>任务列表</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="按提交者 userID 或 用户名 搜索..."
                  value={designerInput}
                  onChange={(e) => setDesignerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setDesigner(designerInput.trim());
                  }}
                  className="pl-10"
                />
              </div>
              {designer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDesignerInput('');
                    setDesigner('');
                  }}
                >
                  清除用户
                </Button>
              )}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="txt2img">文生图</SelectItem>
                  <SelectItem value="img2img">图生图</SelectItem>
                  <SelectItem value="txt2speech">文生语音</SelectItem>
                  <SelectItem value="speech2txt">语音转文字</SelectItem>
                  <SelectItem value="txt2music">文生音乐</SelectItem>
                  <SelectItem value="txt2video">文生视频</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="0">排队中</SelectItem>
                  <SelectItem value="1">处理中</SelectItem>
                  <SelectItem value="2">已完成</SelectItem>
                  <SelectItem value="3">失败</SelectItem>
                  <SelectItem value="4">已结算</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchTasks} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">暂无任务数据</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[180px]">任务ID</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">类型</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[140px]">模型</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[130px]">提交人</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">状态</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[200px]">错误信息</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[150px]">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.objectId} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell
                            value={task.task_id || task.objectId}
                            mono
                            maxWidth="max-w-[160px]"
                          />
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {typeLabels[task.type] || task.type}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={task.model || ''} maxWidth="max-w-[130px]" />
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <div className="flex flex-col gap-0.5">
                            <CopyableCell
                              value={task.username || '-'}
                              maxWidth="max-w-[120px]"
                            />
                            <span
                              className="text-[11px] text-muted-foreground truncate max-w-[120px]"
                              title={task.designer}
                            >
                              {task.designer || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <Badge variant={statusColors[task.status] || 'default'}>
                            {statusLabels[task.status] ?? task.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-destructive">
                          <div className="truncate max-w-[200px]" title={task.errorMessage || ''}>
                            {task.errorMessage || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                          {task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '-'}
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
