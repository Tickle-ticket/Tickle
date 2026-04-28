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
  title?: string;
  className?: string;
}

const defaultItems: AdminSidebarItem[] = [
  { label: '서버 모니터링', href: '/admin' },
  { label: '대기열 상태 모니터링', href: '/admin/queue' },
  { label: '봇 탐지 현황판', href: '/admin/bot-detection' },
];

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  const hrefDepth = href.split('/').filter(Boolean).length;

  if (hrefDepth <= 1) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  items = defaultItems,
  brandLabel = '티클 관리자',
  title = '관리자',
  className = '',
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden h-screen w-[280px] shrink-0 flex-col justify-between overflow-y-auto border-r border-white/60 bg-white/72 px-5 py-6 backdrop-blur-2xl shadow-[20px_0_60px_rgba(15,23,42,0.06)] lg:flex ${className}`}
    >
      <div>
        <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(239,246,255,0.88))] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4">
            <Image
              src="/tickle.svg"
              alt={brandLabel}
              width={160}
              height={48}
              className="h-auto w-[132px]"
              priority
            />
            <div>
              <h1 className="text-[32px] font-black tracking-tight text-slate-950">{title}</h1>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
            오늘 필요한 운영 화면만 모아서 빠르게 이동할 수 있는 워크스페이스입니다.
          </p>
        </div>

        <nav className="mt-8 space-y-2" aria-label="관리 메뉴">
          {items.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                className={`block w-full rounded-2xl px-4 py-3.5 text-left text-sm font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]'
                    : 'bg-white/70 text-slate-600 ring-1 ring-black/5 hover:bg-white hover:text-slate-950 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]'
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
