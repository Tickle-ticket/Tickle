import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/src/shared/components/Logo';
import { SearchBar } from '@/src/shared/components/SearchBar';
import { Avatar } from '@/src/shared/components/Avatar';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { authApi } from '@/src/shared/api/authApi';
import { clearTokens } from '@/src/shared/api/tokenManager';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useSearchData } from '@/src/features/search/api/useSearchData';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Title } from '@/src/shared/components/Title';

export const Header = () => {
  const router = useRouter();
  const { data, isLoading: isUserLoading } = useUserProfile();
  
  // Zustand 전역 상태로 검색어 연동 (URL 라우팅 안 함 -> 포커스 완벽 유지, IME 분리 문제 해결)
  const { searchValue, setSearchValue, clearSearch } = useSearchStore();
  const [inputValue, setInputValue] = useState(searchValue);
  const { data: searchResults, isLoading: isSearchLoading } = useSearchData(searchValue);
  const { isMypageOpen, activeTab, openMypage, closeMypage } = useMypageStore();
  const { openDetail, closeDetail } = useDetailStore();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // 1. 초기 로딩 시 URL의 q, view, tab 파라미터를 읽어와 Zustand 스토어에 세팅
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      const view = params.get('view');
      const tab = params.get('tab');

      if (q && q !== useSearchStore.getState().searchValue) {
        setSearchValue(q);
      }

      if (view === 'mypage') {
        const mypageStore = useMypageStore.getState();
        if (!mypageStore.isMypageOpen || mypageStore.activeTab !== tab) {
          openMypage((tab as any) || 'USER');
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. searchValue가 외부에서 변경되었을 때 input 값 동기화
  useEffect(() => {
    setInputValue(searchValue);
  }, [searchValue]);

  // 3. 포커스를 잃지 않게 history.replaceState로 실시간 URL 변경 (Search & Mypage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;

      // Search URL 동기화
      if (searchValue) {
        if (url.searchParams.get('q') !== searchValue) {
          url.searchParams.set('q', searchValue);
          changed = true;
        }
      } else {
        if (url.searchParams.has('q')) {
          url.searchParams.delete('q');
          changed = true;
        }
      }

      // Mypage URL 동기화
      if (isMypageOpen) {
        if (url.searchParams.get('view') !== 'mypage' || url.searchParams.get('tab') !== activeTab) {
          url.searchParams.set('view', 'mypage');
          if (activeTab) url.searchParams.set('tab', activeTab);
          changed = true;
        }
      } else {
        if (url.searchParams.has('view')) {
          url.searchParams.delete('view');
          url.searchParams.delete('tab');
          changed = true;
        }
      }

      if (changed) {
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
  }, [searchValue, isMypageOpen, activeTab]);

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
    setInputValue(val);
    setSearchValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputValue.trim()) {
        setSearchValue(inputValue.trim());
        closeMypage();
        closeDetail();
        
        // 엔터 시 즉시 URL 업데이트
        const url = new URL(window.location.href);
        url.searchParams.set('q', inputValue.trim());
        window.history.replaceState(null, '', url.pathname + url.search);

        if (window.location.pathname !== '/') {
          router.push(`/?q=${encodeURIComponent(inputValue.trim())}`);
        }
      }
    }
  };

  const handleLogoClick = () => {
    setInputValue('');
    clearSearch();
    closeMypage();
    closeDetail();
    router.push('/');
  };

  const handleCardClick = (id: string) => {
    setInputValue('');
    clearSearch();
    closeMypage();
    // router.push(`/detail?id=${id}`);
    openDetail(id);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearTokens();
      setIsProfileOpen(false);
      window.location.href = '/login'; // 완전히 상태를 비우고 로그인 화면으로 이동
    } catch (error) {
      console.error('로그아웃 실패:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#f8f8f8] -mx-6 px-6 md:-mx-10 md:px-10 flex items-center justify-between border-b border-black/10 pt-3 pb-3 mb-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-12">
        <Logo variant="black" size="small" onClick={handleLogoClick} />
      </div>

      {/* Right: SearchBar & Avatar */}
      <div className="flex items-center gap-6">
        <div className="hidden sm:block w-48 focus-within:w-64 transition-all duration-300 ease-out">
          <SearchBar
            placeholder="Search... (Enter)"
            value={inputValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onClear={() => {
              setInputValue('');
              clearSearch();
            }}
            fullWidth
            size="small"
          />
        </div>
        
        <div className="relative" ref={profileRef}>
          {isUserLoading ? (
            <Avatar size="medium" src="" isLoading={true} />
          ) : data ? (
            <>
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                data-testid="profile-avatar"
              >
                <Avatar
                  size="medium"
                  src={data.avatarUrl || ''}
                  isLoading={false}
                />
              </div>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-2 z-[60] flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-gray-700 hover:bg-gray-100/50 hover:text-blue-600 rounded-xl transition-colors text-left w-full"
                    onClick={() => {
                      setIsProfileOpen(false);
                      clearSearch();
                      if (window.location.pathname !== '/') {
                        router.push('/?view=mypage&tab=USER');
                      } else {
                        openMypage('USER');
                      }
                    }}
                  >
                    마이페이지
                  </button>
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-gray-700 hover:bg-gray-100/50 hover:text-blue-600 rounded-xl transition-colors text-left w-full"
                    onClick={() => {
                      setIsProfileOpen(false);
                      clearSearch();
                      if (window.location.pathname !== '/') {
                        router.push('/?view=mypage&tab=MY_TICKETS');
                      } else {
                        openMypage('MY_TICKETS');
                      }
                    }}
                  >
                    내 예매 관리
                  </button>
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-gray-700 hover:bg-gray-100/50 hover:text-blue-600 rounded-xl transition-colors text-left w-full"
                    onClick={() => {
                      setIsProfileOpen(false);
                      clearSearch();
                      if (window.location.pathname !== '/') {
                        router.push('/?view=mypage&tab=WAITLIST');
                      } else {
                        openMypage('WAITLIST');
                      }
                    }}
                  >
                    나의 취소표 관리
                  </button>
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-gray-700 hover:bg-gray-100/50 hover:text-blue-600 rounded-xl transition-colors text-left w-full"
                    onClick={() => {
                      setIsProfileOpen(false);
                      clearSearch();
                      if (window.location.pathname !== '/') {
                        router.push('/?view=mypage&tab=UPCOMING');
                      } else {
                        openMypage('UPCOMING');
                      }
                    }}
                  >
                    관심 공연
                  </button>
                  
                  <div className="h-[1px] bg-gray-200/50 my-1 mx-2" />
                  
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-red-500 hover:bg-red-50/50 hover:text-red-600 rounded-xl transition-colors text-left"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </>
          ) : (
            <button 
              onClick={() => {
                const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
                router.push(`/login?redirect=${currentPath}`);
              }}
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center min-w-[72px] h-10"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
