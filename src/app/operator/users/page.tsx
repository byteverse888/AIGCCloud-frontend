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
import { Search, MoreVertical, UserCheck, UserX, Loader2, ChevronLeft, ChevronRight, Key, Coins, Edit2, Plus, Eye } from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CopyableCell } from '@/components/admin/copyable-cell';

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

const roleLabels: Record<string, string> = {
  user: '普通用户',
  operator: '运营用户',
  channel: '渠道用户',
  admin: '管理员',
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
  memberExpireAt?: string;
  web3Address?: string;
  inviteCount?: number;
  successRegCount?: number;
  emailVerified?: boolean;
  updatedAt?: string;
}

export default function OperatorUsersPage() {
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
  const [detailOpen, setDetailOpen] = useState(false);
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
    password: 'User@123456',
    email: '',
    phone: '',
    role: 'user',
    level: 1,
    active: true,
  });

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    phone: '',
    level: 1,
    status: 'active',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // 后端已强制 operator 只能看 role=user
      const result = await adminApi.listUsers({ page, limit, role: 'user' });
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
        memberExpireAt: (u.memberExpireAt as string) || '',
        web3Address: (u.web3Address as string) || '',
        inviteCount: (u.inviteCount as number) || 0,
        successRegCount: (u.successRegCount as number) || 0,
        emailVerified: Boolean(u.emailVerified),
        updatedAt: (u.updatedAt as string) || '',
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
    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error('新密码至少6位');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }
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
        status: editForm.status,
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
      // role 强制 user，运营端不提供其他角色选项
      await adminApi.createUser({ ...createForm, role: 'user' });
      toast.success('用户创建成功');
      setCreateUserOpen(false);
      setCreateForm({ username: '', password: 'User@123456', email: '', phone: '', role: 'user', level: 1, active: true });
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
      status: user.status || 'active',
    });
    setEditUserOpen(true);
  };

  const openDetail = (user: UserRow) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const handleToggleBan = async (user: UserRow) => {
    const isBanned = user.status === 'banned';
    const action = isBanned ? '解封' : '封禁';
    if (!confirm(`确定要${action}用户 ${user.username} 吗？`)) return;
    try {
      await adminApi.updateUser(user.objectId, {
        status: isBanned ? 'active' : 'banned',
      });
      toast.success(`${action}成功`);
      fetchUsers();
    } catch (e) {
      toast.error(`${action}失败`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
        <p className="text-muted-foreground">管理普通用户账号（不含管理员和运营管理员）</p>
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
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[180px]">用户名</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[220px]">邮箱</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[70px]">等级</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[80px]">会员</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[90px]">状态</th>
                      <th className="px-3 py-3 text-left text-xs font-medium whitespace-nowrap w-[120px]">注册时间</th>
                      <th className="px-3 py-3 text-right text-xs font-medium whitespace-nowrap w-[70px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.objectId} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={user.username} maxWidth="max-w-[160px]" />
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <CopyableCell value={user.email} maxWidth="max-w-[200px]" />
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">Lv.{user.level}</td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <Badge variant={user.memberLevel !== 'normal' ? 'default' : 'outline'}>
                            {user.memberLevel === 'normal' ? '普通' : user.memberLevel.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <Badge variant={statusColors[user.status] || 'default'}>
                            {statusLabels[user.status] || user.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => openDetail(user)}>
                                <Eye className="mr-2 h-4 w-4" />
                                查看详情
                              </DropdownMenuItem>
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
                              {user.status === 'banned' ? (
                                <DropdownMenuItem onClick={() => handleToggleBan(user)} className="text-green-600">
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  解封用户
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleToggleBan(user)} className="text-destructive">
                                  <UserX className="mr-2 h-4 w-4" />
                                  封禁用户
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置用户密码</DialogTitle>
            <DialogDescription>为用户 {selectedUser?.username} 重置密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">新密码（可选，不填则自动生成8位密码）</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="留空自动生成；若填写至少6位"
                className="mt-1"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium">确认新密码</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入以确认"
                className="mt-1"
                autoComplete="new-password"
                disabled={!newPassword}
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-destructive">两次密码输入不一致</p>
              )}
            </div>
            {resetResult && (
              <div className="rounded-md bg-green-50 p-4 text-green-800">
                <p className="font-medium">新密码（请妥善保存，仅显示一次）：</p>
                <p className="mt-1 text-2xl font-mono font-bold">{resetResult}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>关闭</Button>
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
            <DialogDescription>为用户 {selectedUser?.username} 充值金币</DialogDescription>
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
            <Button variant="outline" onClick={() => setRechargeOpen(false)}>关闭</Button>
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
            <DialogDescription>修改用户 {selectedUser?.username} 的信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">用户名</label>
              <Input value={editForm.username} className="mt-1" disabled />
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
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">账号激活</p>
                <p className="text-xs text-muted-foreground">关闭后用户将无法登录</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={editForm.status === 'active'}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.checked ? 'active' : 'inactive' })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserOpen(false)}>取消</Button>
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
            <DialogTitle>新建普通用户</DialogTitle>
            <DialogDescription>运营管理员仅可创建普通用户，创建后默认立即激活。</DialogDescription>
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
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">创建后立即激活</p>
                <p className="text-xs text-muted-foreground">关闭则创建后需手动启用账号</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={createForm.active}
                onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
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

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
            <DialogDescription>查看用户 {selectedUser?.username} 的完整信息</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">用户ID</Label>
                  <p className="font-mono text-xs mt-1 break-all">{selectedUser.objectId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">用户名</Label>
                  <p className="mt-1 break-all">{selectedUser.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">邮箱</Label>
                  <p className="mt-1 break-all">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">邮箱激活</Label>
                  <p className="mt-1">
                    <Badge variant={selectedUser.emailVerified ? 'success' : 'outline'}>
                      {selectedUser.emailVerified ? '已验证' : '未验证'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">手机号</Label>
                  <p className="mt-1">{selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">角色</Label>
                  <p className="mt-1">{roleLabels[selectedUser.role] || selectedUser.role}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <p className="mt-1">
                    <Badge variant={statusColors[selectedUser.status] || 'default'}>
                      {statusLabels[selectedUser.status] || selectedUser.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">等级</Label>
                  <p className="mt-1">Lv.{selectedUser.level}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">会员级别</Label>
                  <p className="mt-1">
                    <Badge variant={selectedUser.memberLevel !== 'normal' ? 'default' : 'outline'}>
                      {selectedUser.memberLevel === 'normal' ? '普通' : selectedUser.memberLevel.toUpperCase()}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">会员到期</Label>
                  <p className="mt-1">
                    {selectedUser.memberExpireAt ? new Date(selectedUser.memberExpireAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">邀请人数</Label>
                  <p className="mt-1">{selectedUser.inviteCount ?? 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">成功注册数</Label>
                  <p className="mt-1">{selectedUser.successRegCount ?? 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">注册时间</Label>
                  <p className="mt-1">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">最后更新</Label>
                  <p className="mt-1">
                    {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
              {selectedUser.web3Address && (
                <div>
                  <Label className="text-muted-foreground">Web3钱包</Label>
                  <p className="font-mono text-xs mt-1 break-all">{selectedUser.web3Address}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
