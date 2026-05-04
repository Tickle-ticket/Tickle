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
        <div className="group relative overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-white/80">
          {/* Animated Mesh Gradient Background */}
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(240,249,255,0.8),rgba(255,255,255,0.9),rgba(245,243,255,0.8))]"></div>
          
          {/* Glowing Orbs */}
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-blue-400/20 blur-[40px] transition-transform duration-700 group-hover:scale-110"></div>
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-purple-400/20 blur-[40px] transition-transform duration-700 group-hover:scale-110"></div>

          {/* Glass Reflection Shimmer */}
          <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%] z-0"></div>

          <div className="relative z-10 flex flex-col gap-7">
            {/* Top row: Logo & Badge */}
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-white/60 p-2 backdrop-blur-md shadow-sm border border-white/50 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/tickle.svg"
                  alt={brandLabel}
                  width={100}
                  height={30}
                  className="h-auto w-[90px]"
                  priority
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white"></span>
                </span>
                <span className="text-[10px] font-black tracking-widest text-white">SYS.ADMIN</span>
              </div>
            </div>
            
            {/* Middle: Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_8px_16px_rgba(79,70,229,0.25)] text-white transform transition-all duration-500 group-hover:rotate-[15deg] group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h1 className="text-[34px] font-black tracking-tight">
                <span className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-700 bg-clip-text text-transparent">
                  {title}
                </span>
                <span className="text-blue-500">.</span>
              </h1>
            </div>

            {/* Bottom: Description Card */}
            <div className="relative overflow-hidden rounded-[20px] bg-white/70 p-4 border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-colors duration-300 hover:bg-white/90">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500"></div>
              <p className="text-[13px] font-semibold leading-relaxed text-slate-600 pl-2">
                오늘 필요한 운영 화면만 모아서 빠르게 이동할 수 있는 <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-black">워크스페이스</span>입니다.
              </p>
            </div>
          </div>
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
