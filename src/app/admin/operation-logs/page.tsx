'use client';

import { OperationLogsView } from '@/components/admin/operation-logs-view';

export default function AdminOperationLogsPage() {
  return (
    <OperationLogsView
      title="操作日志"
      description="查看所有管理员和运营管理员的操作记录"
    />
  );
}
