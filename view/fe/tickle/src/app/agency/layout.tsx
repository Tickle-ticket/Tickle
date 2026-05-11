import { AgencySidebar } from '@/src/shared/components/AgencySidebar';
import { RoleGuard } from '@/src/shared/components/RoleGuard';
import { WorkspaceScaffold } from '@/src/shared/components/WorkspaceScaffold';

export default function AgencyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGuard allowedRoles={['ORGANIZER']}>
      <WorkspaceScaffold tone="agency" sidebar={<AgencySidebar />}>
        {children}
      </WorkspaceScaffold>
    </RoleGuard>
  );
}
