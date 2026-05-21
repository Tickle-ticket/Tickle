import { AdminSidebar } from '@/src/shared/components/AdminSidebar';
import { RoleGuard } from '@/src/shared/components/RoleGuard';
import { WorkspaceScaffold } from '@/src/shared/components/WorkspaceScaffold';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <WorkspaceScaffold tone="admin" sidebar={<AdminSidebar />}>
        {children}
      </WorkspaceScaffold>
    </RoleGuard>
  );
}
