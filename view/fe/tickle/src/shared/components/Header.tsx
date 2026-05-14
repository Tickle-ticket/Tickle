import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/src/shared/components/Logo';
import { SearchBar } from '@/src/shared/components/SearchBar';
import { Avatar } from '@/src/shared/components/Avatar';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { authApi } from '@/src/shared/api/authApi';
import { clearTokens, getAccessToken } from '@/src/shared/api/tokenManager';
import { useSearchStore } from '@/src/shared/store/useSearchStore';
import { useMypageStore } from '@/src/shared/store/useMypageStore';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { InfoCard } from '@/src/shared/components/InfoCard';
import { Title } from '@/src/shared/components/Title';

interface HeaderProps {
  className?: string;
}

export const Header = ({ className = '' }: HeaderProps) => {
  const router = useRouter();
  const { data, isLoading: isUserLoading } = useUserProfile();
  
  // Zustand 전역 상태로 검색어 연동 (URL 라우팅 안 함 -> 포커스 완벽 유지, IME 분리 문제 해결)
  const { searchValue, setSearchValue, clearSearch } = useSearchStore();
  const [inputValue, setInputValue] = useState(searchValue);
  const { isMypageOpen, activeTab, openMypage, closeMypage } = useMypageStore();
  const { selectedDetailId, openDetail, closeDetail } = useDetailStore();
  const searchParams = useSearchParams();
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // 1. 초기 로딩 시 URL의 q, view, tab 파라미터를 읽어와 Zustand 스토어에 세팅
  useEffect(() => {
    const q = searchParams.get('q');
    const view = searchParams.get('view');
    const tab = searchParams.get('tab');

      if (q && q !== useSearchStore.getState().searchValue) {
        setSearchValue(q);
      }

      if (view === 'mypage' && !getAccessToken()) {
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        url.searchParams.delete('tab');
        window.history.replaceState(null, '', url.pathname + url.search);
      } else if (view === 'mypage') {
        const mypageStore = useMypageStore.getState();
        if (!mypageStore.isMypageOpen || mypageStore.activeTab !== tab) {
          openMypage((tab as any) || 'USER');
        }
      }
      setIsInitialSyncDone(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 2. searchValue가 외부에서 변경되었을 때 input 값 동기화
  useEffect(() => {
    setInputValue(searchValue);
  }, [searchValue]);

  // 3. 포커스를 잃지 않게 history.replaceState로 실시간 URL 변경 (Search & Mypage)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialSyncDone) {
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
  }, [searchValue, isMypageOpen, activeTab, isInitialSyncDone]);

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
    <header className={`${selectedDetailId ? 'hidden lg:flex' : 'flex'} sticky top-0 z-50 bg-[#f8f8f8] -mx-6 px-6 md:-mx-10 md:px-10 items-center justify-between border-b border-black/10 pt-3 pb-3 mb-6 ${className}`}>
      {/* Left: Logo */}
      <div className="flex items-center gap-12 shrink-0">
        <Logo variant="black" size="small" onClick={handleLogoClick} />
      </div>

      {/* Right: SearchBar & Avatar */}
      <div className="flex items-center gap-3 sm:gap-6 flex-1 justify-end ml-4">
        <div className="w-full max-w-[140px] sm:max-w-none sm:w-48 focus-within:max-w-[180px] sm:focus-within:w-64 transition-all duration-300 ease-out">
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
                <div className="absolute right-0 mt-3 w-56 bg-surface/80 backdrop-blur-xl border border-line/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-2 z-[60] flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-content-secondary hover:bg-surface-muted/50 hover:text-primary rounded-xl transition-colors text-left w-full"
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
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-content-secondary hover:bg-surface-muted/50 hover:text-primary rounded-xl transition-colors text-left w-full"
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
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-content-secondary hover:bg-surface-muted/50 hover:text-primary rounded-xl transition-colors text-left w-full"
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
                    취소표 대기 현황
                  </button>
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-content-secondary hover:bg-surface-muted/50 hover:text-primary rounded-xl transition-colors text-left w-full"
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
                  
                  <div className="h-[1px] bg-surface-active/50 my-1 mx-2" />
                  
                  <button 
                    className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold text-danger hover:bg-danger-subtle/50 hover:text-danger rounded-xl transition-colors text-left"
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
              className="px-4 py-2 text-sm font-bold text-content-secondary bg-surface border border-line rounded-full hover:bg-surface-subtle hover:text-primary transition-all shadow-sm flex items-center justify-center min-w-[72px] h-10"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
