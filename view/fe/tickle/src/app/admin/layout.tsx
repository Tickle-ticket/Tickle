import { AdminSidebar } from '@/src/shared/components/AdminSidebar';
import { WorkspaceScaffold } from '@/src/shared/components/WorkspaceScaffold';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WorkspaceScaffold tone="admin" sidebar={<AdminSidebar />}>
      {children}
    </WorkspaceScaffold>
  );
}
