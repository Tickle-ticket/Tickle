import React, { useState, useEffect } from 'react';
import { HomeIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, MagnifyingGlassIcon as SearchSolid, UserIcon as UserSolid } from '@heroicons/react/24/solid';
import { useRouter, usePathname } from 'next/navigation';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { useDetailStore } from '@/src/shared/store/useDetailStore';

export const MobileBottomNav = () => {
  const router = useRouter();
  const { searchValue, setSearchValue, clearSearch } = useSearchStore();
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
  const isHome = !searchValue && !isMypageOpen && pathname === '/';
  const isSearch = !!searchValue;
  const isMypage = isMypageOpen;

  const navItems = [
    {
      key: 'home',
      label: '홈',
      icon: HomeIcon,
      activeIcon: HomeSolid,
      isActive: isHome,
      onClick: () => {
        clearSearch();
        closeMypage();
        closeDetail();
        router.push('/');
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
        if (!searchValue) setSearchValue(' '); 
      }
    },
    {
      key: 'mypage',
      label: '마이',
      icon: UserIcon,
      activeIcon: UserSolid,
      isActive: isMypage,
      onClick: () => {
        clearSearch();
        closeDetail();
        openMypage('USER');
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
