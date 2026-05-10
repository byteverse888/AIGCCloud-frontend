'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Plus, Edit, Users, Trash2, Loader2, Lock } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

interface Role {
  objectId: string;
  name: string;
  label: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

const allPermissions = [
  { key: 'users.manage', label: '用户管理' },
  { key: 'roles.manage', label: '角色管理' },
  { key: 'products.manage', label: '商品管理' },
  { key: 'products.review', label: '商品审批' },
  { key: 'orders.manage', label: '订单管理' },
  { key: 'coupons', label: '券码管理' },
  { key: 'promotions', label: '促销管理' },
  { key: 'recharge', label: '充值管理' },
  { key: 'statistics', label: '报表统计' },
  { key: 'settings', label: '系统设置' },
  { key: 'channel.manage', label: '渠道管理' },
  { key: 'channel.stats', label: '渠道统计' },
];

export default function AdminRolesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    label: '',
    description: '',
    permissions: [] as string[],
  });

const fetchRoles = async () => {
    try {
      const res = await adminApi.listRoles();
      setRoles(res.roles || []);
      setLoadError(null);
    } catch (err: unknown) {
      const error = err as { detail?: string };
      if (error?.detail === 'Admin permission required') {
        setLoadError('您没有权限访问角色管理功能');
      } else {
        console.error('Failed to fetch roles:', err);
        setLoadError('加载角色列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setEditPermissions(role.permissions);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingRole) return;
    setSaving(true);
    try {
      await adminApi.updateRole(editingRole.objectId, editPermissions);
      setRoles(prev => prev.map(r =>
        r.objectId === editingRole.objectId ? { ...r, permissions: editPermissions } : r
      ));
      setEditDialogOpen(false);
      toast.success('角色权限已更新');
    } catch (err) {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`确定要删除角色 "${role.label}" 吗？`)) return;
    try {
      await adminApi.deleteRole(role.objectId);
      setRoles(prev => prev.filter(r => r.objectId !== role.objectId));
      toast.success('角色已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const togglePermission = (key: string) => {
    setEditPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.label) {
      toast.error('请填写角色名称和标识');
      return;
    }
    setCreating(true);
    try {
      await adminApi.createRole({
        name: createForm.name,
        label: createForm.label,
        description: createForm.description,
        permissions: createForm.permissions,
      });
      toast.success('角色创建成功');
      setCreateDialogOpen(false);
      setCreateForm({ name: '', label: '', description: '', permissions: [] });
      fetchRoles();
    } catch (err: unknown) {
      const error = err as { detail?: string };
      toast.error(error?.detail || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const toggleCreatePermission = (key: string) => {
    setCreateForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">无权访问</h2>
        <p className="text-muted-foreground">{loadError}</p>
        <p className="text-sm text-muted-foreground">角色管理功能仅对管理员开放</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">角色管理</h1>
          <p className="text-muted-foreground">管理系统角色和权限配置</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增角色
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">角色名称</th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">标识</th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">描述</th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">权限</th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">用户数</th>
                <th className="p-3 text-left text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.objectId} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{role.label}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground font-mono">{role.name}</td>
                  <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate">{role.description}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.includes('*') ? (
                        <Badge>全部权限</Badge>
                      ) : role.permissions.length === 0 ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : (
                        <>
                          {role.permissions.slice(0, 2).map(p => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {allPermissions.find(ap => ap.key === p)?.label || p}
                            </Badge>
                          ))}
                          {role.permissions.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{role.permissions.length - 2}</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{role.userCount}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {role.name !== 'admin' && role.name !== 'user' && role.name !== 'operator' && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(role)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 编辑权限对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑权限 - {editingRole?.label}</DialogTitle>
            <DialogDescription>配置该角色可访问的功能模块</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {allPermissions.map((perm) => (
              <div key={perm.key} className="flex items-center justify-between">
                <Label htmlFor={perm.key} className="cursor-pointer">{perm.label}</Label>
                <Switch
                  id={perm.key}
                  checked={editPermissions.includes('*') || editPermissions.includes(perm.key)}
                  onCheckedChange={() => togglePermission(perm.key)}
                  disabled={editPermissions.includes('*')}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建角色对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建角色</DialogTitle>
            <DialogDescription>创建一个新的角色并配置权限</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">角色标识 *</Label>
              <Input
                id="role-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="如：editor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-label">角色名称 *</Label>
              <Input
                id="role-label"
                value={createForm.label}
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                placeholder="如：编辑"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">描述</Label>
              <Input
                id="role-description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="角色描述"
              />
            </div>
            <div className="space-y-2">
              <Label>权限配置</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                {allPermissions.map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between">
                    <Label htmlFor={`create-${perm.key}`} className="cursor-pointer text-sm">{perm.label}</Label>
                    <Switch
                      id={`create-${perm.key}`}
                      checked={createForm.permissions.includes(perm.key)}
                      onCheckedChange={() => toggleCreatePermission(perm.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
