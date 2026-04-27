import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/src/shared/components/Logo';
import { SearchBar } from '@/src/shared/components/SearchBar';
import { Avatar } from '@/src/shared/components/Avatar';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useSearchData } from '@/src/features/search/api/useSearchData';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Title } from '@/src/shared/components/Title';

export const Header = () => {
  const router = useRouter();
  const { data, isLoading: isUserLoading } = useUserProfile();
  
  // Zustand 전역 상태로 검색어 연동 (URL 라우팅 안 함 -> 포커스 완벽 유지, IME 분리 문제 해결)
  const { searchValue, setSearchValue, clearSearch } = useSearchStore();
  const { data: searchResults, isLoading: isSearchLoading } = useSearchData(searchValue);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
  };

  const handleLogoClick = () => {
    clearSearch();
    router.push('/');
  };

  const handleCardClick = (id: string) => {
    clearSearch();
    router.push(`/detail?id=${id}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#f8f8f8] w-full flex items-center justify-between border-b border-black/10 pt-3 pb-3 mb-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-12">
        <Logo variant="black" size="small" onClick={handleLogoClick} />
      </div>

      {/* Right: SearchBar & Avatar */}
      <div className="flex items-center gap-6">
        <div className="hidden sm:block w-48 focus-within:w-64 transition-all duration-300 ease-out">
          <SearchBar
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onClear={clearSearch}
            fullWidth
            size="small"
          />
        </div>
        
        <div className="relative" ref={profileRef}>
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <Avatar
              size="medium"
              src={data?.avatarUrl || ''}
              isLoading={isUserLoading}
            />
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-2 z-[60] flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-gray-700 hover:bg-gray-100/50 hover:text-blue-600 rounded-xl transition-colors text-left w-full"
                onClick={() => {
                  setIsProfileOpen(false);
                  clearSearch();
                  router.push('/mypage');
                }}
              >
                마이페이지
              </button>
              <button 
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-gray-700 hover:bg-gray-100/50 hover:text-blue-600 rounded-xl transition-colors text-left"
                onClick={() => {
                  setIsProfileOpen(false);
                  clearSearch();
                  router.push('/mypage?tab=WAITLIST');
                }}
              >
                나의 취소표 관리
              </button>
              <button 
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-gray-700 hover:bg-gray-100/50 hover:text-blue-600 rounded-xl transition-colors text-left"
                onClick={() => {
                  setIsProfileOpen(false);
                  clearSearch();
                  router.push('/mypage?tab=UPCOMING');
                }}
              >
                관심 공연
              </button>
              
              <div className="h-[1px] bg-gray-200/50 my-1 mx-2" />
              
              <button 
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-red-500 hover:bg-red-50/50 hover:text-red-600 rounded-xl transition-colors text-left"
                onClick={() => setIsProfileOpen(false)}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
