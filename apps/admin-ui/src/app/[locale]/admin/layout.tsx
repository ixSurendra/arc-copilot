import { AdminShell } from '@/components/layout/admin-shell';
import { getCurrentUser, isSuperAdminUser } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <AdminShell email={user?.email} isSuperAdmin={isSuperAdminUser(user)}>
      {children}
    </AdminShell>
  );
}
