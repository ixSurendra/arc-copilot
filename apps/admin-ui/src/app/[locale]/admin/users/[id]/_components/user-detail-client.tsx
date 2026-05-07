'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { useApi } from '@/hooks/use-api';
import {
  updateUserSchema,
  type UpdateUserValues,
} from '@/lib/schemas/user.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { User, Role, Group, PaginatedResponse } from '@/types';

interface UserDetailClientProps {
  user: User;
  initialAssignedRoles: Role[];
  initialAssignedGroups: Group[];
}

export function UserDetailClient({
  user,
  initialAssignedRoles,
  initialAssignedGroups,
}: UserDetailClientProps) {
  const t = useTranslations('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t('profile')}</TabsTrigger>
          <TabsTrigger value="roles">{t('assignedRoles')}</TabsTrigger>
          <TabsTrigger value="groups">{t('assignedGroups')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab
            userId={user.id}
            tenantId={user.tenantId}
            initialAssignedRoles={initialAssignedRoles}
          />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsTab
            userId={user.id}
            tenantId={user.tenantId}
            initialAssignedGroups={initialAssignedGroups}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Tab                                                        */
/* ------------------------------------------------------------------ */

function ProfileTab({ user }: { user: User }) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      status: user.status,
    },
  });

  const onSubmit = async (values: UpdateUserValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Failed to update user' }));
        throw new Error(error.message);
      }

      toast.success('User updated successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update user',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4 max-w-2xl shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg">{t('profile')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('email')}</label>
              <Input
                value={user.email}
                disabled
                className="rounded-md bg-muted"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t('firstName')}
                    </FormLabel>
                    <FormControl>
                      <Input className="rounded-md" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t('lastName')}
                    </FormLabel>
                    <FormControl>
                      <Input className="rounded-md" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">{t('phone')}</FormLabel>
                  <FormControl>
                    <Input type="tel" className="rounded-md" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">{tc('status')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-md">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{tc('active')}</SelectItem>
                      <SelectItem value="INACTIVE">
                        {tc('inactive')}
                      </SelectItem>
                      <SelectItem value="SUSPENDED">
                        {tc('suspended')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {tc('save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Roles Tab                                                          */
/* ------------------------------------------------------------------ */

function RolesTab({
  userId,
  tenantId,
  initialAssignedRoles,
}: {
  userId: number;
  tenantId: number;
  initialAssignedRoles: Role[];
}) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [assignedRoles, setAssignedRoles] = useState<Role[]>(initialAssignedRoles);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allRolesData, isLoading: rolesLoading } = useApi<
    PaginatedResponse<Role>
  >(`/api/proxy/admin/roles?limit=100&tenantId=${tenantId}`);

  const assignedIdSet = new Set(assignedRoles.map((r) => r.id));
  const availableRoles = (allRolesData?.data ?? []).filter(
    (r) => !assignedIdSet.has(r.id),
  );

  const handleRemove = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleIds: [deleteTarget.id] }),
      });
      if (!res.ok) throw new Error('Failed to remove role');
      setAssignedRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success(t('roleRemoved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove role');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleIds: [...selectedIds] }),
      });
      if (!res.ok) throw new Error('Failed to add roles');
      const newRoles = (allRolesData?.data ?? []).filter((r) => selectedIds.has(r.id));
      setAssignedRoles((prev) => [...prev, ...newRoles]);
      toast.success(t('rolesAdded'));
      setAddModalOpen(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add roles');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Card className="mt-4 shadow-sm rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('assignedRoles')}</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setSelectedIds(new Set());
              setAddModalOpen(true);
            }}
            disabled={rolesLoading}
          >
            <Plus className="h-4 w-4" />
            {t('addRole')}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>{tc('name')}</TableHead>
                <TableHead className="w-24 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    {t('noRolesAssigned')}
                  </TableCell>
                </TableRow>
              ) : (
                assignedRoles.map((role, index) => (
                  <TableRow key={role.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{role.roleName}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('removeRole')}
        description={t('confirmRemoveRoleDescription')}
        onConfirm={handleRemove}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Add roles modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addRole')}</DialogTitle>
            <DialogDescription>{t('selectRolesToAdd')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {rolesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : availableRoles.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {tc('noResults')}
              </p>
            ) : (
              availableRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(role.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(role.id);
                        else next.delete(role.id);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{role.roleName}</p>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    )}
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

/* ------------------------------------------------------------------ */
/*  Groups Tab                                                         */
/* ------------------------------------------------------------------ */

function GroupsTab({
  userId,
  tenantId,
  initialAssignedGroups,
}: {
  userId: number;
  tenantId: number;
  initialAssignedGroups: Group[];
}) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [assignedGroups, setAssignedGroups] = useState<Group[]>(initialAssignedGroups);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allGroupsData, isLoading: groupsLoading } = useApi<
    PaginatedResponse<Group>
  >(`/api/proxy/admin/groups?limit=100&tenantId=${tenantId}`);

  const assignedIdSet = new Set(assignedGroups.map((g) => g.id));
  const availableGroups = (allGroupsData?.data ?? []).filter(
    (g) => !assignedIdSet.has(g.id),
  );

  const handleRemove = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/groups`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupIds: [deleteTarget.id] }),
      });
      if (!res.ok) throw new Error('Failed to remove group');
      setAssignedGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      toast.success(t('groupRemoved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove group');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupIds: [...selectedIds] }),
      });
      if (!res.ok) throw new Error('Failed to add groups');
      const newGroups = (allGroupsData?.data ?? []).filter((g) => selectedIds.has(g.id));
      setAssignedGroups((prev) => [...prev, ...newGroups]);
      toast.success(t('groupsAdded'));
      setAddModalOpen(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add groups');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Card className="mt-4 shadow-sm rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('assignedGroups')}</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setSelectedIds(new Set());
              setAddModalOpen(true);
            }}
            disabled={groupsLoading}
          >
            <Plus className="h-4 w-4" />
            {t('addGroup')}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>{tc('name')}</TableHead>
                <TableHead className="w-24 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    {t('noGroupsAssigned')}
                  </TableCell>
                </TableRow>
              ) : (
                assignedGroups.map((group, index) => (
                  <TableRow key={group.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{group.groupName}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(group)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('removeGroup')}
        description={t('confirmRemoveGroupDescription')}
        onConfirm={handleRemove}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Add groups modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addGroup')}</DialogTitle>
            <DialogDescription>{t('selectGroupsToAdd')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {groupsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : availableGroups.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {tc('noResults')}
              </p>
            ) : (
              availableGroups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(group.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(group.id);
                        else next.delete(group.id);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{group.groupName}</p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">
                        {group.description}
                      </p>
                    )}
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
