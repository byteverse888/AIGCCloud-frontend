'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, MoreVertical, UserCheck, UserX, Loader2, ChevronLeft, ChevronRight, Key, Coins, Edit2, Plus } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

const roleLabels: Record<string, string> = {
  user: '普通用户',
  operator: '运营用户',
  channel: '渠道用户',
  admin: '管理员',
};

const statusLabels: Record<string, string> = {
  active: '正常',
  inactive: '未激活',
  banned: '已封禁',
};

const statusColors: Record<string, 'success' | 'default' | 'destructive'> = {
  active: 'success',
  inactive: 'default',
  banned: 'destructive',
};

interface UserRow {
  objectId: string;
  username: string;
  email: string;
  role: string;
  level: number;
  memberLevel: string;
  status: string;
  createdAt: string;
  phone?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [rechargeResult, setRechargeResult] = useState<{ amount: number; new_balance: number } | null>(null);

  const [createForm, setCreateForm] = useState({
    username: '',
    password: 'Admin@123456',
    email: '',
    phone: '',
    role: 'user',
    level: 1,
  });

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    phone: '',
    level: 1,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listUsers({ page, limit });
      const rows = (result.data || []).map((u: Record<string, unknown>) => ({
        objectId: u.objectId as string,
        username: (u.username as string) || '',
        email: (u.email as string) || '',
        role: (u.role as string) || 'user',
        level: (u.level as number) || 1,
        memberLevel: (u.memberLevel as string) || 'normal',
        status: (u.status as string) || 'active',
        createdAt: (u.createdAt as string) || '',
        phone: (u.phone as string) || '',
      }));
      setUsers(rows);
      setTotal(result.total);
    } catch (e) {
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  const filteredUsers = searchQuery
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setActionLoading(true);
    setResetResult(null);
    try {
      const result = await adminApi.resetUserPassword(selectedUser.objectId, newPassword || undefined);
      setResetResult(result.new_password);
      toast.success('密码重置成功');
      fetchUsers();
    } catch (e) {
      toast.error('密码重置失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!selectedUser) return;
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('请输入有效的充值金额');
      return;
    }
    setActionLoading(true);
    setRechargeResult(null);
    try {
      const result = await adminApi.rechargeUserAccount(selectedUser.objectId, amount);
      setRechargeResult({ amount: result.amount, new_balance: result.new_balance });
      toast.success('充值成功');
      fetchUsers();
    } catch (e) {
      toast.error('充值失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminApi.updateUser(selectedUser.objectId, {
        email: editForm.email,
        phone: editForm.phone,
        level: editForm.level,
      });
      toast.success('用户信息更新成功');
      setEditUserOpen(false);
      fetchUsers();
    } catch (e) {
      toast.error('更新失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.password) {
      toast.error('请填写用户名和密码');
      return;
    }
    if (createForm.username.length < 3 || createForm.username.length > 20) {
      toast.error('用户名必须为3-20个字符');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('密码至少6位');
      return;
    }
    setCreateLoading(true);
    try {
      await adminApi.createUser(createForm);
      toast.success('用户创建成功');
      setCreateUserOpen(false);
      setCreateForm({ username: '', password: 'Admin@123456', email: '', phone: '', role: 'user', level: 1 });
      fetchUsers();
    } catch (e: unknown) {
      const err = e as { detail?: string };
      toast.error(err?.detail || '创建失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const openResetPassword = (user: UserRow) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetResult(null);
    setResetPasswordOpen(true);
  };

  const openRecharge = (user: UserRow) => {
    setSelectedUser(user);
    setRechargeAmount('');
    setRechargeResult(null);
    setRechargeOpen(true);
  };

  const openEditUser = (user: UserRow) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      level: user.level,
    });
    setEditUserOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
        <p className="text-muted-foreground">管理平台用户账号</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>用户列表</CardTitle>
            <div className="flex items-center gap-4">
              <Button onClick={() => setCreateUserOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新建用户
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索用户..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">用户名</th>
                      <th className="p-3 text-left text-sm font-medium">邮箱</th>
                      <th className="p-3 text-left text-sm font-medium">角色</th>
                      <th className="p-3 text-left text-sm font-medium">等级</th>
                      <th className="p-3 text-left text-sm font-medium">会员</th>
                      <th className="p-3 text-left text-sm font-medium">状态</th>
                      <th className="p-3 text-left text-sm font-medium">注册时间</th>
                      <th className="p-3 text-left text-sm font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.objectId} className="border-b">
                        <td className="p-3 text-sm">{user.username}</td>
                        <td className="p-3 text-sm">{user.email}</td>
                        <td className="p-3 text-sm">{roleLabels[user.role] || user.role}</td>
                        <td className="p-3 text-sm">Lv.{user.level}</td>
                        <td className="p-3 text-sm">
                          <Badge variant={user.memberLevel !== 'normal' ? 'default' : 'outline'}>
                            {user.memberLevel === 'normal' ? '普通' : user.memberLevel.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          <Badge variant={statusColors[user.status] || 'default'}>
                            {statusLabels[user.status] || user.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-sm">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => openEditUser(user)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                编辑用户
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openResetPassword(user)}>
                                <Key className="mr-2 h-4 w-4" />
                                重置密码
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRecharge(user)}>
                                <Coins className="mr-2 h-4 w-4" />
                                充值金币
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <UserX className="mr-2 h-4 w-4" />
                                封禁用户
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  共 {total} 条记录
                </p>
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

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置用户密码</DialogTitle>
            <DialogDescription>
              为用户 {selectedUser?.username} 重置密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">新密码（可选，不填则自动生成8位密码）</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="留空自动生成"
                className="mt-1"
                autoComplete="new-password"
              />
            </div>
            {newPassword && (
              <div>
                <label className="text-sm font-medium">确认密码</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
            )}
            {resetResult && (
              <div className="rounded-md bg-green-50 p-4 text-green-800">
                <p className="font-medium">新密码（请妥善保存，仅显示一次）：</p>
                <p className="mt-1 text-2xl font-mono font-bold">{resetResult}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
              关闭
            </Button>
            {!resetResult && (
              <Button onClick={handleResetPassword} disabled={actionLoading || (newPassword !== '' && newPassword !== confirmPassword)}>
                {actionLoading ? '重置中...' : '确认重置'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>为用户充值金币</DialogTitle>
            <DialogDescription>
              为用户 {selectedUser?.username} 充值金币
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">充值金额（金币）</label>
              <Input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="请输入充值金额"
                min="1"
                className="mt-1"
              />
            </div>
            {rechargeResult && (
              <div className="rounded-md bg-green-50 p-4 text-green-800">
                <p className="font-medium">充值成功！</p>
                <p className="mt-1">
                  充值金额：<span className="font-mono font-bold">{rechargeResult.amount}</span> 金币
                </p>
                <p className="mt-1">
                  新余额：<span className="font-mono font-bold">{rechargeResult.new_balance}</span> 金币
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeOpen(false)}>
              关闭
            </Button>
            {!rechargeResult && (
              <Button onClick={handleRecharge} disabled={actionLoading}>
                {actionLoading ? '充值中...' : '确认充值'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户 {selectedUser?.username} 的信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">用户名</label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="mt-1"
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium">邮箱</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">手机号</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">等级</label>
              <Input
                type="number"
                value={editForm.level}
                onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 1 })}
                className="mt-1"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditUser} disabled={actionLoading}>
              {actionLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>新建用户</DialogTitle>
            <DialogDescription>
              创建一个新的用户账号。创建后账号状态为"未激活"，需要管理员手动启用。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-username">用户名 *</Label>
              <Input
                id="create-username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="3-20个字符"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">密码 *</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="至少6位"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">邮箱</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="选填"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">手机号</Label>
              <Input
                id="create-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="选填"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">角色 *</Label>
              <select
                id="create-role"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full h-10 px-3 border rounded-md bg-background text-sm"
              >
                <option value="user">普通用户</option>
                <option value="operator">运营用户</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-level">等级</Label>
              <Input
                id="create-level"
                type="number"
                min={1}
                max={99}
                value={createForm.level}
                onChange={(e) => setCreateForm({ ...createForm, level: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserOpen(false)}>取消</Button>
            <Button onClick={handleCreateUser} disabled={createLoading}>
              {createLoading ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}