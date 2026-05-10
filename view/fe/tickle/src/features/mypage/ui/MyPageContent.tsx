'use client';

import React from 'react';
import { Title } from '@/src/shared/components/Title';
import SidebarButton from '@/src/shared/components/SidebarButton';
import { UserManagementView } from './UserManagementView';
import { UpcomingWishlistView } from './UpcomingWishlistView';
import { MyBookingsView } from './MyBookingsView';
import { WaitlistManagementView } from './WaitlistManagementView';
import { useMypageStore } from '@/src/shared/store/useMypageStore';

import Tab from '@/src/shared/components/Tab';
import { useState } from 'react';

export const MyPageContent = () => {
  const { activeTab, setActiveTab } = useMypageStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true);

  const tabs = [
    { id: 'USER', label: '회원 관리' },
    { id: 'UPCOMING', label: '관심 있는 개봉 예정 공연' },
    { id: 'MY_TICKETS', label: '내 예매' },
    { id: 'PAST_TICKETS', label: '과거 예매 조회' },
    { id: 'WAITLIST', label: '나의 취소표 관리' },
    { id: 'PAYMENTS', label: '결제 관리' },
  ] as const;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
      {/* 모바일/태블릿 전용 드릴다운 메뉴 리스트 - lg 미만 & 메뉴 열림 상태에서만 표시 */}
      {isMobileMenuOpen && (
        <div className="lg:hidden w-full flex flex-col gap-3 pb-20 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="mb-4">
            <Title title="마이페이지" bottomBorder={false} className="!px-0 !pt-0 [&_h1]:text-2xl" />
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              <span className="text-[17px] font-bold text-gray-800">{tab.label}</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* 데스크톱 전용 LNB (Left Navigation Bar) - lg 이상에서만 표시 */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-28 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-black tracking-tight text-gray-900">마이페이지</h2>
        </div>
        <div className="flex flex-col py-2">
          {tabs.map((tab) => (
            <SidebarButton
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
      <div className={`flex-1 w-full min-h-[500px] pb-20 ${isMobileMenuOpen ? 'hidden lg:block' : 'block animate-in slide-in-from-right-4 duration-300'}`}>
        
        {/* 모바일 전용 뒤로가기 버튼 */}
        <div className="lg:hidden mb-2 -mt-2">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center gap-1.5 text-gray-500 font-bold py-2 pr-4 active:text-gray-900 transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            전체 메뉴
          </button>
        </div>

        <div className="mb-6">
          <Title 
            title={tabs.find(t => t.id === activeTab)?.label || ''} 
            bottomBorder={true} 
            className="!px-0 !pt-0 [&_h1]:text-2xl lg:[&_h1]:text-2xl [&_h1]:text-[22px]" 
          />
        </div>

        {activeTab === 'USER' && <UserManagementView />}
        {activeTab === 'UPCOMING' && <UpcomingWishlistView />}
        {activeTab === 'MY_TICKETS' && <MyBookingsView />}
        {activeTab === 'WAITLIST' && <WaitlistManagementView />}
        
        {activeTab !== 'USER' && activeTab !== 'UPCOMING' && activeTab !== 'MY_TICKETS' && activeTab !== 'WAITLIST' && (
          <div className="flex flex-col items-center justify-center py-32 border border-dashed border-gray-300 rounded-2xl bg-white/50">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            <h3 className="text-lg font-bold text-gray-700 mb-1">준비 중인 페이지입니다</h3>
            <p className="text-sm text-gray-500">해당 기능은 곧 업데이트될 예정입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
