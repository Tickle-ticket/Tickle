'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface AdminSidebarItem {
  label: string;
  href: string;
}

export interface AdminSidebarProps {
  items?: AdminSidebarItem[];
  brandLabel?: string;
  badgeLabel?: string;
  title?: string;
  className?: string;
}

const defaultItems: AdminSidebarItem[] = [
  { label: '블랙리스트 관리', href: '/admin' },
  { label: '대기열 상태', href: '/admin/queue' },
  { label: '봇 탐지 현황', href: '/admin/bot-detection' },
  { label: '서버 모니터링 (목업)', href: '/admin/examples/server' },
  { label: '대기열 상태 (목업)', href: '/admin/examples/queue' },
  { label: '봇 탐지 현황 (목업)', href: '/admin/examples/bot-detection' },
];

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href === '/admin' || href === '/agency') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  items = defaultItems,
  brandLabel = 'Tickle Admin',
  badgeLabel = 'ADMIN',
  title = '관리자',
  className = '',
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden h-screen w-[280px] shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white/90 px-5 py-6 shadow-[20px_0_60px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex ${className}`}
    >
      <div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Image
              src="/tickle.svg"
              alt={brandLabel}
              width={96}
              height={30}
              className="h-auto w-[96px]"
              priority
            />
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black tracking-widest text-white">
              {badgeLabel}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Console</p>
            <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950">{title}</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              관리자 권한이 필요한 운영 API를 기준으로 구성된 페이지입니다.
            </p>
          </div>
        </div>

        <nav className="mt-6 space-y-2" aria-label="관리자 메뉴">
          {items.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                className={`block w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950'
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default AdminSidebar;
