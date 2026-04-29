'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
import { useRouter } from 'next/navigation';
import { CountdownTimer } from '@/src/shared/components/CountdownTimer';
import { useDetailData } from '@/src/features/detail/api/useDetailData';
import { useDetailStore } from '@/src/shared/store/useDetailStore';
import { BookView } from '@/src/features/book/ui/BookView';
import { QueueView } from '@/src/features/queue/ui/QueueView';

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

export const DetailContent = () => {
  const router = useRouter();
  const { selectedDetailId } = useDetailStore();
  const { data, isLoading } = useDetailData(selectedDetailId || '1');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [flowState, setFlowState] = useState<'NONE' | 'QUEUE' | 'BOOK' | 'WAITLIST_QUEUE' | 'WAITLIST_BOOK'>('NONE');
  const [admitToken, setAdmitToken] = useState<string | null>(null);

  // 예매 플로우 진행 중 새로고침/탭 닫기 방지
  useEffect(() => {
    if (flowState === 'NONE') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flowState]);

  useEffect(() => {
    if (data?.openDate) {
      const openTime = new Date(data.openDate).getTime();
      if (openTime > Date.now()) {
        setIsUpcoming(true);
      }
    }
  }, [data?.openDate]);

  const scheduleData = data?.schedules || [];
  const enabledDates = scheduleData.map((item: any) => item.date.split(' ')[0].replace(/\./g, '-'));
  const selectedDateStr = selectedDate ? formatDateToDot(selectedDate) : '';
  const selectedSchedule = scheduleData.find((item: any) => item.date.startsWith(selectedDateStr));

  // 스크롤 스파이 (Scroll Spy) 기능
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

  if (isLoading) {
    return <div className="p-10 animate-pulse text-gray-500">상세 정보를 불러오는 중입니다...</div>;
  }

  return (
    <div className="flex flex-col w-full h-full pb-32 max-w-7xl mx-auto pt-6 px-6 md:px-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <section className="max-w-2xl mt-3 flex flex-col items-start">
        <Title
          title={data?.title || ''}
          textColor="black"
          className="!bg-transparent [&>div]:!p-0 !text-5xl md:[&_h1]:!text-6xl [&_h1]:!font-serif [&_h1]:!tracking-tight [&_h1]:!leading-[1.1] [&_h1]:whitespace-pre-line"
          bottomBorder={false}
        />

        <div className="flex flex-col gap-1 mt-4">
          <BannerSubtitle subtitle={data?.subTitle || ''} color="black" className="!text-base md:!text-[17px]" />
          <BannerPlace place={data?.venue || ''} color="black" className="!text-base md:!text-[17px] font-bold" />
          <BannerTime time={data?.startDate ? `${data?.startDate} ~ ${data?.endDate}` : ''} color="black" className="!text-base md:!text-[17px]" />
        </div>

        <div className="flex flex-col items-start gap-3 mt-6">
          {isUpcoming && data?.openDate ? (
            <div className="flex flex-col items-start gap-4">
              <Text typography="t5" fontWeight="bold" className="text-[#ef4444] animate-pulse">
                예매 오픈까지 남은 시간
              </Text>
              <CountdownTimer 
                targetDate={data.openDate} 
                onExpire={() => setIsUpcoming(false)} 
              />
              <div className="flex items-center gap-3 mt-2 opacity-50 grayscale pointer-events-none">
                <Button color="dark" size="large" className="tracking-wider !rounded-none !px-8 font-bold">
                  예매하기
                </Button>
                <Button color="light" size="large" className="tracking-wider !rounded-none !px-6 font-bold border border-black/10">
                  취소표 대기하기
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button color="dark" size="large" className="tracking-wider !rounded-none !px-8 font-bold" onClick={() => setFlowState('QUEUE')}>
                예매하기
              </Button>
              <Button color="light" size="large" className="tracking-wider !rounded-none !px-6 font-bold border border-black/10" onClick={() => setFlowState('WAITLIST_QUEUE')}>
                취소표 대기하기
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Content Section with Sticky Timeline */}
      <section className="mt-24 pt-16 grid grid-cols-1 lg:grid-cols-[100px_1fr] gap-8 border-t border-black/10 relative items-start">

        {/* Left: Sticky Timeline Navigation */}
        <div className="sticky top-32 self-start hidden lg:block">
          <TimelineNav 
            items={navItems}
            activeIndex={activeIndex}
            onItemClick={(id: string, index: number) => handleScrollTo(id, index)}
          />
        </div>

        {/* Right: Scrollable Sections */}
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
                            'VIP': 'grade-dot-vip',
                            'R': 'grade-dot-r',
                            'S': 'grade-dot-s',
                            'A': 'grade-dot-a',
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
                          selectedDate={selectedDate}
                          onSelect={(date) => setSelectedDate(date ? new Date(date) : null)}
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
      {(flowState === 'QUEUE' || flowState === 'WAITLIST_QUEUE') && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <QueueView 
            sessionId={data?.eventId || '1'} 
            onAdmitted={(token) => {
              setAdmitToken(token);
              setFlowState(flowState === 'QUEUE' ? 'BOOK' : 'WAITLIST_BOOK');
            }}
            onClose={() => setFlowState('NONE')}
          />
        </div>
      )}
      {(flowState === 'BOOK' || flowState === 'WAITLIST_BOOK') && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <BookView eventId={data?.eventId || '1'} mode={flowState === 'WAITLIST_BOOK' ? 'WAITLIST' : 'BOOK'} onClose={() => setFlowState('NONE')} />
        </div>
      )}
    </div>
  );
};
