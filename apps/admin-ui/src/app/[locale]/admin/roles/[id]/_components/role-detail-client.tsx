'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { clientFetch } from '@/lib/api-client-browser';
import { formatDate } from '@/lib/utils';
import {
  updateRoleSchema,
  type UpdateRoleValues,
} from '@/lib/schemas/role.schema';
import type { Role, User, PaginatedResponse } from '@/types';

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
};

interface AssignedPermission {
  moduleId: number;
  moduleName: string;
  permissionId: number;
  permissionName: string;
}

interface ModuleWithPermissions {
  moduleId: number;
  moduleName: string;
  permissions: { permissionId: number; permissionName: string }[];
}

interface RoleDetailClientProps {
  role: Role;
}

export function RoleDetailClient({ role }: RoleDetailClientProps) {
  const t = useTranslations('roles');
  const tc = useTranslations('common');
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);

  // Permission matrix state
  const [modulesWithPermissions, setModulesWithPermissions] = useState<ModuleWithPermissions[]>([]);
  const [assignedPermissions, setAssignedPermissions] = useState<AssignedPermission[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [togglingCells, setTogglingCells] = useState<Set<string>>(new Set());

  const form = useForm<UpdateRoleValues>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      roleName: role.roleName,
      description: role.description ?? '',
      status: role.status as 'ACTIVE' | 'INACTIVE',
    },
  });

  const fetchPermissionMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const [modulesRes, assignedRes] = await Promise.all([
        clientFetch<ModuleWithPermissions[]>(
          '/api/proxy/admin/modules/with-permissions',
        ),
        clientFetch<AssignedPermission[]>(
          `/api/proxy/admin/roles/${role.id}/permissions`,
        ),
      ]);
      setModulesWithPermissions(modulesRes || []);
      setAssignedPermissions(assignedRes || []);
    } catch {
      toast.error(tc('error'));
    } finally {
      setMatrixLoading(false);
    }
  }, [role.id, tc]);

  useEffect(() => {
    fetchPermissionMatrix();
  }, [fetchPermissionMatrix]);

  async function onSubmit(values: UpdateRoleValues) {
    setSubmitting(true);
    try {
      await clientFetch(`/api/proxy/admin/roles/${role.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      toast.success(t('editRole'));
      router.push('/admin/roles');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function isPermissionAssigned(moduleId: number, permissionId: number): boolean {
    return assignedPermissions.some(
      (ap) => ap.moduleId === moduleId && ap.permissionId === permissionId,
    );
  }

  function cellKey(moduleId: number, permissionId: number): string {
    return `${moduleId}:${permissionId}`;
  }

  async function togglePermission(moduleId: number, permissionId: number) {
    const key = cellKey(moduleId, permissionId);
    if (togglingCells.has(key)) return;

    setTogglingCells((prev) => new Set(prev).add(key));

    const assigned = isPermissionAssigned(moduleId, permissionId);

    try {
      if (assigned) {
        await clientFetch(
          `/api/proxy/admin/roles/${role.id}/permissions/${moduleId}/${permissionId}`,
          { method: 'DELETE' },
        );
        setAssignedPermissions((prev) =>
          prev.filter(
            (ap) => !(ap.moduleId === moduleId && ap.permissionId === permissionId),
          ),
        );
        toast.success(tc('save'));
      } else {
        await clientFetch(`/api/proxy/admin/roles/${role.id}/permissions`, {
          method: 'POST',
          body: JSON.stringify({ moduleId, permissionId }),
        });
        setAssignedPermissions((prev) => [
          ...prev,
          { moduleId, permissionId, moduleName: '', permissionName: '' },
        ]);
        toast.success(tc('save'));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    } finally {
      setTogglingCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/roles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{role.roleName}</h1>
          <Badge variant={STATUS_VARIANT_MAP[role.status] || 'secondary'}>
            {role.status}
          </Badge>
        </div>
      </div>

      {/* Role Info Summary */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('roleName')}</dt>
              <dd className="mt-1 font-medium">{role.roleName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('description')}</dt>
              <dd className="mt-1 font-medium">{role.description || '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('status')}</dt>
              <dd className="mt-1 font-medium">{role.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('createdAt')}</dt>
              <dd className="mt-1 font-medium">
                {formatDate(role.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('editRole')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('permissionMatrix')}</TabsTrigger>
          <TabsTrigger value="users">{t('assignedUsers')}</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card className="max-w-2xl shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg">{t('editRole')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Role Name */}
                    <FormField
                      control={form.control}
                      name="roleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            {t('roleName')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('roleName')}
                              className="rounded-md"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{tc('status')}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-md">
                                <SelectValue placeholder={tc('status')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">
                                {tc('active')}
                              </SelectItem>
                              <SelectItem value="INACTIVE">
                                {tc('inactive')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description (full width) */}
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">
                              {t('description')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('description')}
                                className="rounded-md"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={submitting}>
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {tc('save')}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/admin/roles">{tc('cancel')}</Link>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permission Matrix Tab — Accordion per Module */}
        <TabsContent value="permissions">
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg">{t('permissionMatrix')}</CardTitle>
            </CardHeader>
            <CardContent>
              {matrixLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : modulesWithPermissions.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {tc('noResults')}
                </p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {modulesWithPermissions.map((mod) => (
                    <AccordionItem key={mod.moduleId} value={`module-${mod.moduleId}`}>
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                        <span>
                          Module: <span className="text-primary">{mod.moduleName}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {mod.permissions.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">
                            {tc('noResults')}
                          </p>
                        ) : (
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {mod.permissions.map((perm) => {
                              const key = cellKey(mod.moduleId, perm.permissionId);
                              const checked = isPermissionAssigned(mod.moduleId, perm.permissionId);
                              const toggling = togglingCells.has(key);
                              return (
                                <label
                                  key={perm.permissionId}
                                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                                >
                                  {toggling ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() =>
                                        togglePermission(mod.moduleId, perm.permissionId)
                                      }
                                    />
                                  )}
                                  <span className="text-sm font-medium">
                                    {perm.permissionName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assigned Users Tab */}
        <TabsContent value="users">
          <AssignedUsersTab roleId={role.id} tenantId={role.tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Assigned Users Tab                                                 */
/* ------------------------------------------------------------------ */

function AssignedUsersTab({
  roleId,
  tenantId,
}: {
  roleId: number;
  tenantId: number;
}) {
  const t = useTranslations('roles');
  const tc = useTranslations('common');
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch users assigned to this role
  const { data: roleUsersData, isLoading: roleUsersLoading } = useApi<User[]>(
    `/api/proxy/admin/roles/${roleId}/users`,
  );

  // Fetch all tenant users for the "add" modal
  const { data: allUsersData, isLoading: allUsersLoading } = useApi<
    PaginatedResponse<User>
  >(`/api/proxy/admin/users?limit=200&tenantId=${tenantId}`);

  useEffect(() => {
    if (roleUsersData && !initialLoaded) {
      setAssignedUsers(roleUsersData);
      setInitialLoaded(true);
    }
  }, [roleUsersData, initialLoaded]);

  // Filter available users (not already assigned) + client-side search
  const assignedIdSet = new Set(assignedUsers.map((u) => u.id));
  const availableUsers = (allUsersData?.data ?? []).filter(
    (u) => !assignedIdSet.has(u.id),
  );
  const filteredUsers = searchQuery
    ? availableUsers.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : availableUsers;

  const handleRemove = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/proxy/admin/roles/${roleId}/users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: [deleteTarget.id] }),
      });
      if (!res.ok) throw new Error('Failed to remove user');
      setAssignedUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success(t('userRemoved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/proxy/admin/roles/${roleId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: [...selectedIds] }),
      });
      if (!res.ok) throw new Error('Failed to add users');
      const newUsers = (allUsersData?.data ?? []).filter((u) =>
        selectedIds.has(u.id),
      );
      setAssignedUsers((prev) => [...prev, ...newUsers]);
      toast.success(t('usersAdded'));
      setAddModalOpen(false);
      setSelectedIds(new Set());
      setSearchQuery('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Card className="mt-4 shadow-sm rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('assignedUsers')}</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setSelectedIds(new Set());
              setSearchQuery('');
              setAddModalOpen(true);
            }}
            disabled={allUsersLoading}
          >
            <Plus className="h-4 w-4" />
            {t('addUser')}
          </Button>
        </CardHeader>
        <CardContent>
          {roleUsersLoading && !initialLoaded ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{tc('name')}</TableHead>
                  <TableHead className="w-24 text-right">
                    {tc('actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {t('noUsersAssigned')}
                    </TableCell>
                  </TableRow>
                ) : (
                  assignedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('removeUser')}
        description={t('confirmRemoveUserDescription')}
        onConfirm={handleRemove}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Add users modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addUser')}</DialogTitle>
            <DialogDescription>{t('selectUsersToAdd')}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchUsers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {allUsersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {tc('noResults')}
              </p>
            ) : (
              filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(user.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(user.id);
                        else next.delete(user.id);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || isAdding}
            >
              {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc('submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
