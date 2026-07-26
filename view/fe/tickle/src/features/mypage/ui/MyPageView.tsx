'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/src/shared/components/Header';
import { Title } from '@/src/shared/components/Title';
import SidebarButton from '@/src/shared/components/SidebarButton';
import { UserManagementView } from './UserManagementView';
import { ProfileEditView } from './ProfileEditView';
import { UpcomingWishlistView } from './UpcomingWishlistView';
import { MyBookingsView } from './MyBookingsView';
import { WaitlistManagementView } from './WaitlistManagementView';
import { SearchContent } from '@/src/shared/components/SearchContent';

type TabType = 'USER' | 'EDIT_PROFILE' | 'UPCOMING' | 'MY_TICKETS' | 'PAST_TICKETS' | 'WAITLIST' | 'PAYMENTS';

const tabs = [
  { id: 'USER', label: '회원 관리' },
  { id: 'EDIT_PROFILE', label: '내 정보 수정' },
  { id: 'UPCOMING', label: '관심 있는 개봉 예정 공연' },
  { id: 'MY_TICKETS', label: '내 예매' },
  { id: 'PAST_TICKETS', label: '과거 예매 조회' },
  { id: 'WAITLIST', label: '취소표 대기 현황' },
  { id: 'PAYMENTS', label: '결제 관리' },
] as const satisfies readonly { id: TabType; label: string }[];

const getInitialTab = (): TabType => {
  if (typeof window === 'undefined') return 'USER';

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  return tabs.some((item) => item.id === tab) ? (tab as TabType) : 'USER';
};

export const MyPageView = () => {
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQ = searchParams.get('q');
  const isSearchMode = rawQ !== null;
  const searchValue = rawQ ?? '';

  // 마이페이지 진입 시 검색 상태 초기화 — q만 제거하고 view/tab은 유지
  React.useEffect(() => {
    if (searchParams.get('q') !== null) {
      const params = new URLSearchParams(window.location.search);
      params.delete('q');
      const qs = params.toString();
      router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex w-full h-screen bg-[#f8f8f8] font-sans overflow-hidden relative">
      {/* 부드러운 화면 전환을 위해 다른 페이지들과 동일한 형태의 접힌 배너 DOM을 유지 (애니메이션 연속성) */}
      <aside className="hidden lg:block h-full relative transition-[width,min-width,opacity] duration-500 ease-in-out overflow-hidden shrink-0 w-0 min-w-0 opacity-0" />

      <main className="flex-1 h-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 overflow-y-auto transition-all duration-500 relative scrollbar-hide [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <Header />
        
        {isSearchMode ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SearchContent query={searchValue || ' '} />
          </div>
        ) : (
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
            {/* LNB (Left Navigation Bar) */}
            <aside className="w-full md:w-[260px] shrink-0 sticky top-28 bg-surface border border-line rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-line-subtle bg-surface-subtle">
                <h2 className="text-lg font-black tracking-tight text-content">마이페이지</h2>
              </div>
              <div className="flex flex-col py-2">
                {tabs.map((tab) => (
                  <SidebarButton
                    key={tab.id}
                    label={tab.label}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    fontSize={14}
                    fontWeight={activeTab === tab.id ? 800 : 500}
                    textColor="#6b7280"
                    activeTextColor="#2563eb"
                    activeBackgroundColor="#eff6ff"
                    hoverBackgroundColor="#f9fafb"
                    className="h-12 !px-5"
                  />
                ))}
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 w-full min-h-[500px] pb-20">
              <div className="mb-6">
                <Title 
                  title={tabs.find(t => t.id === activeTab)?.label || ''} 
                  bottomBorder={true} 
                  className="!px-0 !pt-0 [&_h1]:text-2xl" 
                />
              </div>

              {activeTab === 'USER' && <UserManagementView />}
              {activeTab === 'EDIT_PROFILE' && <ProfileEditView />}
              {activeTab === 'UPCOMING' && <UpcomingWishlistView />}
              {activeTab === 'MY_TICKETS' && <MyBookingsView />}
              {activeTab === 'WAITLIST' && <WaitlistManagementView />}
              
              {activeTab !== 'USER' && activeTab !== 'EDIT_PROFILE' && activeTab !== 'UPCOMING' && activeTab !== 'MY_TICKETS' && activeTab !== 'WAITLIST' && (
                <div className="flex flex-col items-center justify-center py-32 border border-dashed border-line-strong rounded-2xl bg-surface/50">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-content-muted mb-4">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                  <h3 className="text-lg font-bold text-content-secondary mb-1">준비 중인 페이지입니다</h3>
                  <p className="text-sm text-content-tertiary">해당 기능은 곧 업데이트될 예정입니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
