import React, { useState, useEffect } from 'react';
import { HomeIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, MagnifyingGlassIcon as SearchSolid, UserIcon as UserSolid } from '@heroicons/react/24/solid';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { useDetailStore } from '@/src/shared/store/useDetailStore';

export const MobileBottomNav = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSearchMode = searchParams.get('q') !== null;
  const { isMypageOpen, openMypage, closeMypage } = useMypageStore();
  const { closeDetail } = useDetailStore();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScrollUp = () => setIsVisible(true);
    const handleScrollDown = () => setIsVisible(false);

    window.addEventListener('tickle-scroll-up', handleScrollUp);
    window.addEventListener('tickle-scroll-down', handleScrollDown);

    return () => {
      window.removeEventListener('tickle-scroll-up', handleScrollUp);
      window.removeEventListener('tickle-scroll-down', handleScrollDown);
    };
  }, []);

  const pathname = usePathname();
  const isHome = !isSearchMode && !isMypageOpen && pathname === '/';
  const isSearch = isSearchMode;
  const isMypage = isMypageOpen;

  // q만 제거하고 나머지 쿼리는 유지
  const removeQuery = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const navItems = [
    {
      key: 'home',
      label: '홈',
      icon: HomeIcon,
      activeIcon: HomeSolid,
      isActive: isHome,
      onClick: () => {
        closeMypage();
        closeDetail();
        router.push('/'); // q 없는 홈으로 → 검색 해제
      }
    },
    {
      key: 'search',
      label: '검색',
      icon: MagnifyingGlassIcon,
      activeIcon: SearchSolid,
      isActive: isSearch,
      onClick: () => {
        closeMypage();
        closeDetail();
        if (!isSearchMode) router.push('/?q='); // 빈 검색모드 진입
      }
    },
    {
      key: 'mypage',
      label: '마이',
      icon: UserIcon,
      activeIcon: UserSolid,
      isActive: isMypage,
      onClick: () => {
        closeDetail();
        openMypage('USER');
        if (isSearchMode) removeQuery(); // 검색 중이었다면 q 제거
      }
    }
  ];

  return (
    <nav className={`fixed z-[100] flex items-center justify-around transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden bottom-0 left-0 right-0 w-full h-[68px] bg-surface border-t border-line-subtle pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.02)] md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[320px] md:h-[64px] md:bg-surface/90 md:backdrop-blur-xl md:border md:border-white/50 md:rounded-full md:shadow-[0_8px_32px_rgba(0,0,0,0.1)] md:pb-0 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0 pointer-events-none'
    }`}>
      {navItems.map(item => {
        const Icon = item.isActive ? item.activeIcon : item.icon;
        return (
          <button
            key={item.key}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center w-full h-full gap-1.5 transition-colors ${
              item.isActive ? 'text-content' : 'text-content-muted hover:text-content-secondary'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </button>
        )
      })}
    </nav>
  );
};
