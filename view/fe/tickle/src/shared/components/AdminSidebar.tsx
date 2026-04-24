'use client';

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
  brandLabel = 'Tikkle Admin',
  title = '관리자',
  className = '',
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden w-64 shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:block ${className}`}
    >
      <div className="mb-10">
        <p className="text-sm font-semibold text-blue-600">{brandLabel}</p>
        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
      </div>

      <nav className="space-y-1" aria-label="Admin navigation">
        {items.map((item) => {
          const isActive = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              className={`block w-full rounded-lg px-4 py-3 text-left text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
