import { AdminSidebar } from '@/src/features/admin/ui/AdminSidebar';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <section className="flex min-w-0 flex-1 flex-col">{children}</section>
      </div>
    </main>
  );
}
