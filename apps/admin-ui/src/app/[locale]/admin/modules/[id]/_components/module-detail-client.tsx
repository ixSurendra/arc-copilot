'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { useApi } from '@/hooks/use-api';
import {
  updateModuleSchema,
  type UpdateModuleValues,
} from '@/lib/schemas/module.schema';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import type { ModuleMaster, PermissionMaster, PaginatedResponse } from '@/types';

interface ModuleDetailClientProps {
  module: ModuleMaster;
  initialAssignedPermissions: PermissionMaster[];
}

export function ModuleDetailClient({
  module: mod,
  initialAssignedPermissions,
}: ModuleDetailClientProps) {
  const t = useTranslations('modules');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/modules">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{mod.moduleName}</h1>
          <Badge
            variant={mod.status === 'ACTIVE' ? 'default' : 'secondary'}
          >
            {mod.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('editModule')}</TabsTrigger>
          <TabsTrigger value="permissions">
            {t('assignedPermissions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <DetailsTab module={mod} />
        </TabsContent>

        <TabsContent value="permissions">
          <AssignedPermissionsTab
            moduleId={mod.id}
            initialAssignedPermissions={initialAssignedPermissions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Details Tab                                                        */
/* ------------------------------------------------------------------ */

function DetailsTab({ module: mod }: { module: ModuleMaster }) {
  const t = useTranslations('modules');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateModuleValues>({
    resolver: zodResolver(updateModuleSchema),
    defaultValues: {
      moduleName: mod.moduleName,
      moduleKey: mod.moduleKey,
      description: mod.description || '',
      status: mod.status as 'ACTIVE' | 'INACTIVE',
    },
  });

  const onSubmit = async (values: UpdateModuleValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/proxy/admin/modules/${mod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Failed to update module' }));
        throw new Error(error.message);
      }

      toast.success(t('editModule'));
      router.push('/admin/modules');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tc('error'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4 max-w-2xl shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-lg">{t('editModule')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Module Info Summary */}
        <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('moduleKey')}</dt>
            <dd className="mt-1 font-medium">{mod.moduleKey}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tc('status')}</dt>
            <dd className="mt-1 font-medium">{mod.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{tc('createdAt')}</dt>
            <dd className="mt-1 font-medium">{formatDate(mod.createdAt)}</dd>
          </div>
        </dl>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Module Name */}
              <FormField
                control={form.control}
                name="moduleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t('moduleName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('moduleName')}
                        className="rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Module Key */}
              <FormField
                control={form.control}
                name="moduleKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t('moduleKey')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('moduleKey')}
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
            </div>

            {/* Description */}
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
                      placeholder={t('description')}
                      className="rounded-md"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {tc('save')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/modules">{tc('cancel')}</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Assigned Permissions Tab                                           */
/* ------------------------------------------------------------------ */

function AssignedPermissionsTab({
  moduleId,
  initialAssignedPermissions,
}: {
  moduleId: number;
  initialAssignedPermissions: PermissionMaster[];
}) {
  const t = useTranslations('modules');
  const tc = useTranslations('common');

  const [assignedPermissions, setAssignedPermissions] = useState<PermissionMaster[]>(
    initialAssignedPermissions,
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PermissionMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all permissions for the "add" modal
  const { data: allPermissionsData, isLoading: allPermissionsLoading } = useApi<
    PaginatedResponse<PermissionMaster>
  >('/api/proxy/admin/permissions?limit=100');

  // Filter available permissions (not already assigned) + client-side search
  const assignedIdSet = new Set(assignedPermissions.map((p) => p.id));
  const availablePermissions = (allPermissionsData?.data ?? []).filter(
    (p) => !assignedIdSet.has(p.id),
  );
  const filteredPermissions = searchQuery
    ? availablePermissions.filter(
        (p) =>
          p.permissionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.permissionKey.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : availablePermissions;

  const handleRemove = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/modules/${moduleId}/permissions/${deleteTarget.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error('Failed to remove permission');
      setAssignedPermissions((prev) =>
        prev.filter((p) => p.id !== deleteTarget.id),
      );
      toast.success(t('permissionRemoved'));
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
      // The backend POST /modules/:id/permissions accepts { permissionIds: number[] }
      const res = await fetch(
        `/api/proxy/admin/modules/${moduleId}/permissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ permissionIds: [...selectedIds] }),
        },
      );
      if (!res.ok) throw new Error('Failed to assign permissions');

      const newPermissions = (allPermissionsData?.data ?? []).filter((p) =>
        selectedIds.has(p.id),
      );
      setAssignedPermissions((prev) => [...prev, ...newPermissions]);
      toast.success(t('permissionsAssigned'));
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
          <CardTitle className="text-lg">{t('assignedPermissions')}</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setSelectedIds(new Set());
              setSearchQuery('');
              setAddModalOpen(true);
            }}
            disabled={allPermissionsLoading}
          >
            <Plus className="h-4 w-4" />
            {t('assignPermissions')}
          </Button>
        </CardHeader>
        <CardContent>
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
              {assignedPermissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {t('noPermissionsAssigned')}
                  </TableCell>
                </TableRow>
              ) : (
                assignedPermissions.map((perm, index) => (
                  <TableRow key={perm.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{perm.permissionName}</p>
                        <p className="text-xs text-muted-foreground">
                          {perm.permissionKey}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(perm)}
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
        title={t('removePermission')}
        description={t('confirmRemovePermissionDescription')}
        onConfirm={handleRemove}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Add permissions modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('assignPermissions')}</DialogTitle>
            <DialogDescription>{t('selectPermissionsToAdd')}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPermissions')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {allPermissionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredPermissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {tc('noResults')}
              </p>
            ) : (
              filteredPermissions.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(perm.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(perm.id);
                        else next.delete(perm.id);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {perm.permissionName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {perm.permissionKey}
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
