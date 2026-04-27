import { AgencySidebar } from '@/src/shared/components/AgencySidebar';

export default function AgencyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AgencySidebar />
        <section className="flex min-w-0 flex-1 flex-col">{children}</section>
      </div>
    </main>
  );
}
