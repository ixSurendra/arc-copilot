'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { useApi } from '@/hooks/use-api';
import {
  updateGroupSchema,
  type UpdateGroupValues,
} from '@/lib/schemas/group.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatDate } from '@/lib/utils';
import type { Group, Role, User, PaginatedResponse } from '@/types';

interface GroupDetailClientProps {
  group: Group;
}

export function GroupDetailClient({ group }: GroupDetailClientProps) {
  const t = useTranslations('groups');
  const tc = useTranslations('common');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{group.groupName}</h1>
          <Badge
            variant={group.status === 'ACTIVE' ? 'default' : 'secondary'}
          >
            {group.status}
          </Badge>
        </div>
      </div>

      {/* Group Info Summary */}
      <Card className="shadow-sm rounded-lg">
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('groupName')}</dt>
              <dd className="mt-1 font-medium">{group.groupName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('description')}</dt>
              <dd className="mt-1 font-medium">
                {group.description || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('status')}</dt>
              <dd className="mt-1 font-medium">{group.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc('createdAt')}</dt>
              <dd className="mt-1 font-medium">
                {formatDate(group.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('editGroup')}</TabsTrigger>
          <TabsTrigger value="roles">{t('assignRoles')}</TabsTrigger>
          <TabsTrigger value="users">{t('assignedUsers')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <DetailsTab group={group} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab groupId={group.id} tenantId={group.tenantId} />
        </TabsContent>

        <TabsContent value="users">
          <AssignedUsersTab groupId={group.id} tenantId={group.tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Details Tab                                                        */
/* ------------------------------------------------------------------ */

function DetailsTab({ group }: { group: Group }) {
  const t = useTranslations('groups');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateGroupValues>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      groupName: group.groupName,
      description: group.description || '',
      status: group.status as 'ACTIVE' | 'INACTIVE',
    },
  });

  const onSubmit = async (values: UpdateGroupValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/admin/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Failed to update group' }));
        throw new Error(error.message);
      }

      toast.success('Group updated successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update group',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4 max-w-2xl shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg">{t('editGroup')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">{t('groupName')}</FormLabel>
                  <FormControl>
                    <Input className="rounded-md" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t('description')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="rounded-md"
                      rows={3}
                      {...field}
                    />
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
  groupId,
  tenantId,
}: {
  groupId: number;
  tenantId: number;
}) {
  const t = useTranslations('groups');
  const tc = useTranslations('common');
  const [isSaving, setIsSaving] = useState(false);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [originalIds, setOriginalIds] = useState<Set<number>>(new Set());
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch all available roles for the tenant
  const { data: rolesData, isLoading: rolesLoading } = useApi<
    PaginatedResponse<Role>
  >(`/api/proxy/admin/roles?limit=100&tenantId=${tenantId}`);

  // Fetch roles currently assigned to this group
  const { data: assignedRolesData, isLoading: assignedLoading } = useApi<
    Role[]
  >(`/api/proxy/admin/groups/${groupId}/roles`);

  useEffect(() => {
    if (assignedRolesData && !initialLoaded) {
      const ids = new Set(assignedRolesData.map((r) => r.id));
      setAssignedIds(ids);
      setOriginalIds(new Set(ids));
      setInitialLoaded(true);
    }
  }, [assignedRolesData, initialLoaded]);

  const toggleRole = useCallback((roleId: number) => {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toAdd = [...assignedIds].filter((id) => !originalIds.has(id));
      const toRemove = [...originalIds].filter((id) => !assignedIds.has(id));

      if (toAdd.length > 0) {
        const addRes = await fetch(
          `/api/proxy/admin/groups/${groupId}/roles`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ roleIds: toAdd }),
          },
        );
        if (!addRes.ok) {
          throw new Error('Failed to assign roles');
        }
      }

      if (toRemove.length > 0) {
        const removeRes = await fetch(
          `/api/proxy/admin/groups/${groupId}/roles`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ roleIds: toRemove }),
          },
        );
        if (!removeRes.ok) {
          throw new Error('Failed to remove roles');
        }
      }

      setOriginalIds(new Set(assignedIds));
      toast.success('Roles updated successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update roles',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    [...assignedIds].some((id) => !originalIds.has(id)) ||
    [...originalIds].some((id) => !assignedIds.has(id));

  const isLoading = rolesLoading || assignedLoading;

  return (
    <Card className="mt-4 shadow-sm rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{t('assignRoles')}</CardTitle>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {tc('save')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !rolesData?.data.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {tc('noResults')}
          </p>
        ) : (
          <div className="space-y-3">
            {rolesData.data.map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={assignedIds.has(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{role.roleName}</p>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    role.status === 'ACTIVE' ? 'default' : 'secondary'
                  }
                >
                  {role.status}
                </Badge>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Assigned Users Tab                                                 */
/* ------------------------------------------------------------------ */

function AssignedUsersTab({
  groupId,
  tenantId,
}: {
  groupId: number;
  tenantId: number;
}) {
  const t = useTranslations('groups');
  const tc = useTranslations('common');
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch users assigned to this group
  const { data: groupUsersData, isLoading: groupUsersLoading } = useApi<User[]>(
    `/api/proxy/admin/groups/${groupId}/users`,
  );

  // Fetch all tenant users for the "add" modal
  const { data: allUsersData, isLoading: allUsersLoading } = useApi<
    PaginatedResponse<User>
  >(`/api/proxy/admin/users?limit=200&tenantId=${tenantId}`);

  useEffect(() => {
    if (groupUsersData && !initialLoaded) {
      setAssignedUsers(groupUsersData);
      setInitialLoaded(true);
    }
  }, [groupUsersData, initialLoaded]);

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
      const res = await fetch(`/api/proxy/admin/groups/${groupId}/users`, {
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
      const res = await fetch(`/api/proxy/admin/groups/${groupId}/users`, {
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
          {groupUsersLoading && !initialLoaded ? (
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
