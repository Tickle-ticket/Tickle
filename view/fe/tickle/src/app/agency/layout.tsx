import { AgencySidebar } from '@/src/shared/components/AgencySidebar';
import { WorkspaceScaffold } from '@/src/shared/components/WorkspaceScaffold';

export default function AgencyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WorkspaceScaffold tone="agency" sidebar={<AgencySidebar />}>
      {children}
    </WorkspaceScaffold>
  );
}
