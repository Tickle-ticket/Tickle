'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Title } from '@/src/shared/components/Title';
import { BannerSubtitle } from '@/src/shared/components/BannerSubtitle';
import { BannerPlace } from '@/src/shared/components/BannerPlace';
import { BannerTime } from '@/src/shared/components/BannerTime';
import Button from '@/src/shared/components/Button';
import { Text } from '@/src/shared/components/Text';
import { Table } from '@/src/shared/components/Table';
import { Box } from '@/src/shared/components/Box';
import { Calendar } from '@/src/shared/components/Calendar';
import { TimelineNav } from '@/src/shared/components/TimelineNav';
import { CountdownTimer } from '@/src/shared/components/CountdownTimer';
import { useDetailData } from '@/src/features/detail/api/useDetailData';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { BookView } from '@/src/features/book/ui/BookView';
import { QueueView } from '@/src/features/queue/ui/QueueView';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import { Header } from '@/src/shared/components/Header';
import { PanelToggle } from '@/src/shared/components/PanelToggle';
import { Footer } from '@/src/shared/components/Footer';
import { createFavorite, deleteFavorite } from '@/src/shared/api/favoriteApi';

const navItems = [
  { id: 'info', title: '공연 정보' },
  { id: 'price', title: '가격 정보' },
  { id: 'schedule', title: '공연 일정' },
  { id: 'details', title: '상세 정보' },
];

const formatDateToDot = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

interface DetailViewProps {
  isOverlay?: boolean;
}

export const DetailView = ({ isOverlay = false }: DetailViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedDetailId, setDetailBannerOpen } = useDetailStore();
  
  const urlId = searchParams?.get('id');
  const activeEventId = selectedDetailId || urlId || '1';
  
  const { data, isLoading } = useDetailData(activeEventId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [isWaitlistUpcoming, setIsWaitlistUpcoming] = useState(false);
  const [isMoreThanOneDayLeft, setIsMoreThanOneDayLeft] = useState(false);
  const [isWaitlistMoreThanOneDayLeft, setIsWaitlistMoreThanOneDayLeft] = useState(false);
  const [flowState, setFlowState] = useState<'NONE' | 'QUEUE' | 'BOOK' | 'WAITLIST_QUEUE' | 'WAITLIST_BOOK' | 'TEST_WAITLIST_QUEUE' | 'TEST_WAITLIST_BOOK'>('NONE');
  const [admitToken, setAdmitToken] = useState<string | null>(null);
  const [isBannerFolded, setIsBannerFolded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (data) {
      setIsFavorite(data.isFavorite);
    }
  }, [data?.isFavorite]);

  const handleFavoriteToggle = async () => {
    try {
      if (isFavorite) {
        await deleteFavorite(activeEventId);
      } else {
        await createFavorite(activeEventId);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('찜 등록/취소 실패:', error);
    }
  };

  // 예매 플로우 진행 중 새로고침/탭 닫기 방지
  useEffect(() => {
    if (flowState === 'NONE') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // @ts-ignore
      if (window.__isNavigatingToPayment__) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flowState]);

  useEffect(() => {
    if (data?.openDate) {
      const openTime = new Date(data.openDate).getTime();
      const waitlistOpenTime = openTime + 24 * 60 * 60 * 1000;

      const checkTime = () => {
        const now = Date.now();
        setIsUpcoming(openTime > now);
        setIsWaitlistUpcoming(waitlistOpenTime > now);
        setIsMoreThanOneDayLeft(openTime - now > 24 * 60 * 60 * 1000);
        setIsWaitlistMoreThanOneDayLeft(waitlistOpenTime - now > 24 * 60 * 60 * 1000);
      };

      checkTime();
      const timer = setInterval(checkTime, 1000);
      return () => clearInterval(timer);
    }
  }, [data?.openDate]);

  const formatOpenDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = days[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}.${day}(${dayOfWeek}) ${hours}:${minutes}`;
  };

  const scheduleData = data?.schedules || [];
  const enabledDates = scheduleData.map((item: any) => item.date.split(' ')[0].replace(/\./g, '-'));
  const selectedDateStr = selectedDate ? formatDateToDot(selectedDate) : '';
  const selectedSchedule = scheduleData.find((item: any) => item.date.startsWith(selectedDateStr));

  // 스크롤 스파이 (Scroll Spy)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = navItems.findIndex((item) => item.id === entry.target.id);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    navItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [isLoading]);

  const handleScrollTo = (id: string, index: number) => {
    setActiveIndex(index);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderContent = () => (
    <div className="flex flex-col w-full h-full pb-32 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <section className="max-w-2xl mt-3 flex flex-col items-start">
        <Title
          title={data?.title || ''}
          textColor="black"
          className="!bg-transparent [&>div]:!p-0 !text-5xl md:[&_h1]:!text-6xl [&_h1]:!font-serif [&_h1]:!tracking-tight [&_h1]:!leading-[1.1] [&_h1]:whitespace-pre-line"
          bottomBorder={false}
          isLoading={isLoading}
        />

        <div className="flex flex-col gap-1 mt-4">
          <BannerSubtitle subtitle={data?.subTitle || ''} color="black" className="!text-base md:!text-[17px]" isLoading={isLoading} />
          <BannerPlace place={data?.venue || ''} color="black" className="!text-base md:!text-[17px] font-bold" isLoading={isLoading} />
          <BannerTime time={data?.startDate ? `${data?.startDate} ~ ${data?.endDate}` : ''} color="black" className="!text-base md:!text-[17px]" isLoading={isLoading} />
        </div>

        <div className="flex flex-col gap-3 mt-6 w-full max-w-[540px]">
          {/* 예약 버튼 그룹 + 찜하기 버튼 */}
          <div className="flex items-center gap-3 w-full">
            {/* 예약 버튼 묶음 */}
            <div className="flex items-center flex-1 gap-2">
              
              {/* 예매하기 버튼 */}
              <Button 
                color="dark" 
                size="large" 
                className={`flex-1 flex items-center justify-center h-14 !rounded-md !px-0 transition-all duration-300 shadow-sm ${isUpcoming ? 'opacity-80 pointer-events-none bg-slate-800' : ''}`} 
                onClick={() => !isUpcoming && setFlowState('QUEUE')} 
                isLoading={isLoading}
              >
                {isUpcoming && data?.openDate ? (
                  isMoreThanOneDayLeft ? (
                    <span className="font-bold tracking-wider text-[15px]">{formatOpenDate(data.openDate)}</span>
                  ) : (
                    <div className="flex items-center justify-center whitespace-nowrap">
                      <div className="flex items-center bg-white/10 rounded-md px-2.5 py-1 border border-white/5 shadow-inner text-white">
                        <CountdownTimer targetDate={data.openDate} onExpire={() => setIsUpcoming(false)} variant="compact" />
                      </div>
                    </div>
                  )
                ) : (
                  <span className="font-bold tracking-wider text-[15px]">예매하기</span>
                )}
              </Button>

              {/* 취소표 대기하기 버튼 */}
              <Button 
                color="light" 
                size="large" 
                className={`flex-1 flex items-center justify-center h-14 !rounded-md !px-0 border border-black/10 transition-all duration-300 shadow-sm overflow-hidden ${isWaitlistUpcoming ? 'bg-slate-50 opacity-90 pointer-events-none' : ''}`} 
                onClick={() => !isWaitlistUpcoming && setFlowState('WAITLIST_QUEUE')} 
                isLoading={isLoading}
              >
                {isWaitlistUpcoming && data?.openDate ? (
                  isWaitlistMoreThanOneDayLeft ? (
                    <span className="font-bold tracking-wider text-[15px]">{formatOpenDate(new Date(new Date(data.openDate).getTime() + 24 * 60 * 60 * 1000).toISOString())}</span>
                  ) : (
                    <div className="flex items-center justify-center whitespace-nowrap">
                      <div className="flex items-center bg-slate-200/60 rounded-md px-2.5 py-1 border border-slate-300 shadow-inner text-slate-800">
                        <CountdownTimer targetDate={new Date(new Date(data.openDate).getTime() + 24 * 60 * 60 * 1000).toISOString()} onExpire={() => setIsWaitlistUpcoming(false)} variant="compact" />
                      </div>
                    </div>
                  )
                ) : (
                  <span className="font-bold tracking-wider text-[15px]">취소표 대기하기</span>
                )}
              </Button>
            </div>

            {/* 찜하기 버튼 */}
            <button
              onClick={handleFavoriteToggle}
              className={`w-14 h-14 flex items-center justify-center rounded-full border transition-colors shadow-sm shrink-0 ${isFavorite ? 'border-red-100 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              aria-label={isFavorite ? '찜 해제' : '찜 추가'}
            >
              {isFavorite ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
              )}
            </button>
          </div>

          {/* Test Buttons - 개발용 */}
          <div className="flex items-center gap-3 w-full mt-2">
            {/* 위쪽 버튼 그룹과 정확히 동일한 너비를 가지도록 flex-1 설정 */}
            <div className="flex items-center flex-1 gap-2">
              <Button color="dark" size="small" className="flex-1 opacity-50 !bg-gray-500 hover:!bg-gray-600 !rounded-md" onClick={() => setFlowState('TEST_WAITLIST_QUEUE')}>
                Test: Waitlist Queue
              </Button>
              <Button color="light" size="small" className="flex-1 opacity-50 border border-gray-300 !rounded-md hover:bg-gray-100" onClick={() => setFlowState('TEST_WAITLIST_BOOK')}>
                Test: Waitlist Book
              </Button>
            </div>
            
            {/* 우측 찜하기 버튼과 동일한 크기의 투명 영역을 두어 정렬 맞춤 */}
            <div className="w-12 shrink-0 invisible pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Content Section with Sticky Timeline */}
      <section className="mt-24 pt-16 grid grid-cols-1 lg:grid-cols-[100px_1fr] gap-8 border-t border-black/10 relative items-start">
        <div className="sticky top-32 self-start hidden lg:block">
          <TimelineNav
            items={navItems}
            activeIndex={activeIndex}
            onItemClick={(id: string, index: number) => handleScrollTo(id, index)}
          />
        </div>

        <div className="flex flex-col gap-8">
          {/* 1. 공연 정보 */}
          <div id="info" className="scroll-mt-32 w-full">
            <Box variant="flat" padding="medium" className="w-full border border-black/5">
              <div className="flex flex-col items-start gap-4">
                <Title title="공연 정보" bottomBorder={true} className="!px-0 !pt-0 !pb-4 mb-1 w-full [&>div]:!px-0 [&_h1]:!text-xl" />
                <div className="flex flex-col gap-6 w-full">
                  {[
                    { title: '장소', descriptions: [data?.venue || '', data?.venueAddress || ''] },
                    { title: '공지사항', descriptions: data?.notice?.split('\n') || [] }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <Text typography="t6" fontWeight="bold" color="primary">{item.title}</Text>
                      <div className="flex flex-col gap-0.5">
                        {item.descriptions.map((desc, dIdx) => desc && (
                          <Text key={dIdx} typography="t6" color="secondary">{desc}</Text>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Box>
          </div>

          <div className="flex flex-col gap-8 w-full">
            {/* 2. 가격 */}
            <div id="price" className="scroll-mt-32 transition-all duration-500 ease-in-out w-full">
              <Box variant="flat" padding="large" className="w-full border border-black/5 flex flex-col gap-4 shadow-sm bg-white rounded-2xl">
                <Title title="가격 정보" bottomBorder={false} className="!px-0 !pt-0 !pb-2 mb-0 w-full [&>div]:!px-0 [&_h1]:!text-2xl shrink-0" />
                <div className="w-full rounded-xl overflow-hidden border border-gray-100">
                  <Table
                    columns={[
                      {
                        key: 'seat',
                        header: '좌석 등급',
                        align: 'left',
                        render: (row: any) => {
                          const gradeColors: Record<string, string> = {
                            'VIP': 'bg-pink-400',
                            'R': 'bg-yellow-400',
                            'S': 'bg-orange-400',
                            'A': 'bg-blue-400',
                          };
                          return (
                            <div className="flex items-center gap-3">
                              <span className={`w-3 h-3 rounded-full ${gradeColors[row.grade] || 'bg-gray-200'}`} />
                              <Text typography="t5" fontWeight="bold" color="primary">{row.grade}</Text>
                            </div>
                          );
                        }
                      },
                      {
                        key: 'price',
                        header: '가격',
                        align: 'right',
                        render: (row: any) => (
                          <Text typography="t5" fontWeight="medium" color="primary">{row.price.toLocaleString()}원</Text>
                        )
                      },
                    ]}
                    data={data?.zonePrices || []}
                  />
                </div>
              </Box>
            </div>

            {/* 3. 공연 일정 */}
            <div id="schedule" className="scroll-mt-32 transition-all duration-500 ease-in-out w-full">
              <Box variant="flat" padding="medium" className="w-full border border-black/5">
                <div className="flex flex-col items-start gap-4 w-full">
                  <Title title="공연 일정" bottomBorder={true} className="!px-0 !pt-0 !pb-4 mb-1 w-full [&>div]:!px-0 [&_h1]:!text-xl shrink-0" />
                  <div className="flex flex-col gap-8 w-full mt-2">
                    <div className="w-full flex justify-center">
                      <Calendar
                        enabledDates={enabledDates}
                        selectedDate={selectedDate ? formatDateToDot(selectedDate).replace(/\./g, '-') : null}
                        onSelect={(date) => {
                          setSelectedDate(date ? new Date(date) : null);
                        }}
                      />
                    </div>

                    <div className="w-full">
                      {selectedSchedule ? (
                        <div className="flex flex-col gap-4">
                          <Text typography="t5" fontWeight="bold" color="primary">선택하신 날짜의 회차</Text>
                          <div className="flex flex-wrap gap-3">
                            {selectedSchedule.times.map((timeObj: any, idx: number) => (
                              <div
                                key={idx}
                                className="inline-flex flex-col items-center justify-center px-6 py-3 border border-gray-200 rounded-xl bg-white"
                              >
                                <Text typography="t4" fontWeight="bold" color="primary">{timeObj.time}</Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                          <Text typography="t6" color="tertiary">관람하실 날짜를 캘린더에서 선택해주세요.</Text>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Box>
            </div>
          </div>

          {/* 4. 상세 정보 */}
          <div id="details" className="scroll-mt-32 w-full mt-8">
            <Box variant="flat" padding="medium" className="w-full border border-black/5 bg-gray-50 flex flex-col items-center justify-center min-h-[500px] overflow-hidden rounded-xl">
              {data?.detailImageUrl ? (
                <Image
                  src={data.detailImageUrl}
                  alt="상세 정보"
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: '100%', height: 'auto' }}
                  className="w-full h-auto object-cover rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-gray-400">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <Text typography="t5" color="secondary">상세 이미지 준비 중입니다</Text>
                </div>
              )}
            </Box>
          </div>

        </div>
      </section>

      {/* Booking Pipeline Overlays */}
      {(flowState === 'QUEUE' || flowState === 'WAITLIST_QUEUE' || flowState === 'TEST_WAITLIST_QUEUE') && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <QueueView
            sessionId={data?.eventId || '1'}
            onAdmitted={(token) => {
              setAdmitToken(token);
              if (flowState === 'TEST_WAITLIST_QUEUE') setFlowState('TEST_WAITLIST_BOOK');
              else setFlowState(flowState === 'QUEUE' ? 'BOOK' : 'WAITLIST_BOOK');
            }}
            onClose={() => setFlowState('NONE')}
          />
        </div>
      )}
      {(flowState === 'BOOK' || flowState === 'WAITLIST_BOOK' || flowState === 'TEST_WAITLIST_BOOK') && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <BookView eventId={activeEventId} mode={(flowState === 'WAITLIST_BOOK' || flowState === 'TEST_WAITLIST_BOOK') ? 'WAITLIST' : 'BOOK'} onClose={() => setFlowState('NONE')} />
        </div>
      )}
    </div>
  );

  if (isOverlay) {
    return renderContent();
  }

  return (
    <div className="flex w-full h-screen bg-[#f8f8f8] font-sans overflow-hidden relative">
      <aside
        className={`hidden lg:block h-full relative transition-[width,min-width,opacity] duration-500 ease-in-out overflow-hidden shrink-0 ${
          isBannerFolded ? 'w-0 min-w-0 opacity-0' : 'w-2/5 min-w-[40%] opacity-100'
        }`}
      >
        <div className="w-[40vw] h-full">
          <BannerPoster
            src={data?.imageUrl || ''}
            alt="Detail Banner"
            isLoading={isLoading}
            width="100%"
            height="100%"
            showGradient={false}
            className="rounded-none md:rounded-none max-w-full"
          >
            <div className="flex flex-col justify-between h-full p-4"></div>
          </BannerPoster>
        </div>
      </aside>

      <PanelToggle 
        isFolded={isBannerFolded} 
        onToggle={() => setIsBannerFolded(!isBannerFolded)} 
      />

      <main 
        className="flex-1 min-w-0 h-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 overflow-y-auto transition-all duration-500 relative scrollbar-hide [&::-webkit-scrollbar]:hidden" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <Header />
        
        <div className="flex-1 w-full min-w-0">
          {renderContent()}
        </div>

        <Footer />
      </main>
    </div>
  );
};
