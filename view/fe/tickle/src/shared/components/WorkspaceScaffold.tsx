import type { ReactNode } from 'react';

type WorkspaceTone = 'agency' | 'admin';

interface WorkspaceScaffoldProps {
  children: ReactNode;
  sidebar: ReactNode;
  tone?: WorkspaceTone;
}

const toneBackdropClass: Record<WorkspaceTone, { primary: string; secondary: string }> = {
  agency: {
    primary:
      'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2),rgba(59,130,246,0)_72%)]',
    secondary:
      'bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.16),rgba(244,114,182,0)_70%)]',
  },
  admin: {
    primary:
      'bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.2),rgba(14,165,233,0)_72%)]',
    secondary:
      'bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.16),rgba(52,211,153,0)_70%)]',
  },
};

export function WorkspaceScaffold({
  children,
  sidebar,
  tone = 'admin',
}: WorkspaceScaffoldProps) {
  const backdrop = toneBackdropClass[tone];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-[-10%] top-[-8%] h-[32rem] w-[32rem] rounded-full blur-3xl ${backdrop.primary}`} />
        <div className={`absolute right-[-10%] top-[8%] h-[28rem] w-[28rem] rounded-full blur-3xl ${backdrop.secondary}`} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,252,0.94)_42%,rgba(244,247,251,0.98))]" />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:84px_84px]" />
      </div>

      <div className="relative flex min-h-screen">
        {sidebar}
        <section className="relative min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}

export default WorkspaceScaffold;
