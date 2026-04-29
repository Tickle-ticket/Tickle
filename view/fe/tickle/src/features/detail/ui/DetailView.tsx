'use client';

import React, { useState, useEffect } from 'react';
import { useDetailData } from '@/src/features/detail/api/useDetailData';
import { BannerPoster } from '@/src/shared/components/BannerPoster';
import { Title } from '@/src/shared/components/Title';
import { BannerSubtitle } from '@/src/shared/components/BannerSubtitle';
import { BannerPlace } from '@/src/shared/components/BannerPlace';
import { BannerTime } from '@/src/shared/components/BannerTime';
import Button from '@/src/shared/components/Button';
import { Header } from '@/src/shared/components/Header';
import { Text } from '@/src/shared/components/Text';
import { Table } from '@/src/shared/components/Table';
import { Box } from '@/src/shared/components/Box';
import { Calendar } from '@/src/shared/components/Calendar';
import { motion } from 'framer-motion';
import { PanelToggle } from '@/src/shared/components/PanelToggle';
import { TimelineNav } from '@/src/shared/components/TimelineNav';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookView } from '@/src/features/book/ui/BookView';
import { QueueView } from '@/src/features/queue/ui/QueueView';
import { CountdownTimer } from '@/src/shared/components/CountdownTimer';
import { Footer } from '@/src/shared/components/Footer';

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

export const DetailView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id') || undefined;
  const { data, isLoading } = useDetailData(eventId);
  const [isBannerFolded, setIsBannerFolded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [flowState, setFlowState] = useState<'NONE' | 'QUEUE' | 'BOOK' | 'WAITLIST_QUEUE' | 'WAITLIST_BOOK' | 'TEST_WAITLIST_QUEUE' | 'TEST_WAITLIST_BOOK'>('NONE');
  const [admitToken, setAdmitToken] = useState<string | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);

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

  // 예매 플로우 진행 중 새로고침/탭 닫기 방지
  useEffect(() => {
    if (flowState === 'NONE') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flowState]);

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

  return (
    <div className="flex w-full h-screen bg-[#f8f8f8] font-sans overflow-hidden relative">

      {/* Left Column: Shared BannerPoster Component */}
      <aside
        className={`hidden lg:block h-full relative transition-[width,min-width,opacity] duration-500 ease-in-out overflow-hidden shrink-0 ${isBannerFolded ? 'w-0 min-w-0 opacity-0' : 'w-2/5 min-w-[40%] opacity-100'
          }`}
      >
        <div className="w-[40vw] h-full">
          <BannerPoster
            src={data?.imageUrl || ''}
            alt="Home Banner"
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

      {/* Toggle Button */}
      <PanelToggle
        isFolded={isBannerFolded}
        onToggle={() => setIsBannerFolded(!isBannerFolded)}
      />

      {/* Right Column: Main Content */}
      <main className="flex-1 h-full flex flex-col px-6 pt-0 pb-12 md:px-10 md:pb-16 overflow-y-auto transition-all duration-500 relative scrollbar-hide [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        <Header />

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
            <BannerTime time={data?.startDate ? `${data.startDate} ~ ${data.endDate}` : ''} color="black" className="!text-base md:!text-[17px]" />
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
                  <Button color="dark" size="large" className="tracking-wider !rounded-none !px-8 font-bold" isLoading={isLoading}>
                    예매하기
                  </Button>
                  <Button color="light" size="large" className="tracking-wider !rounded-none !px-6 font-bold border border-black/10" isLoading={isLoading}>
                    취소표 대기하기
                  </Button>
                </div>
                {/* 테스트용 버튼: 예매 대기 중이어도 강제 진입 가능하도록 활성화 상태로 둠 */}
                <div className="flex items-center gap-3 mt-2">
                  <Button color="light" size="large" className="tracking-wider !rounded-none !px-6 font-bold border border-red-500/30 text-red-500 bg-red-50/50" onClick={() => setFlowState('TEST_WAITLIST_QUEUE')} isLoading={isLoading}>
                    Test
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button color="dark" size="large" className="tracking-wider !rounded-none !px-8 font-bold" onClick={() => setFlowState('QUEUE')} isLoading={isLoading}>
                  예매하기
                </Button>
                <Button color="light" size="large" className="tracking-wider !rounded-none !px-6 font-bold border border-black/10" onClick={() => setFlowState('WAITLIST_QUEUE')} isLoading={isLoading}>
                  취소표 대기하기
                </Button>
                <Button color="light" size="large" className="tracking-wider !rounded-none !px-6 font-bold border border-red-500/30 text-red-500 bg-red-50/50" onClick={() => setFlowState('TEST_WAITLIST_QUEUE')} isLoading={isLoading}>
                  Test
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Content Section with Sticky Timeline */}
        <section className="mt-24 pt-16 grid grid-cols-1 lg:grid-cols-[100px_1fr] gap-8 border-t border-black/10 relative items-start">

          {/* Left: Sticky Timeline Navigation */}
          <div className="sticky top-32 self-start">
            <TimelineNav
              items={navItems}
              activeIndex={activeIndex}
              onItemClick={(id, index) => handleScrollTo(id, index)}
            />
          </div>

          {/* Right: Scrollable Sections */}
          <div className="flex flex-col gap-8 pb-32">

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
                                <span className={`w-3 h-3 rounded-full ${gradeColors[row.seat] || 'bg-gray-200'}`} />
                                <Text typography="t5" fontWeight="bold" color="primary">{row.seat}</Text>
                              </div>
                            );
                          }
                        },
                        {
                          key: 'price',
                          header: '가격',
                          align: 'right',
                          render: (row: any) => (
                            <Text typography="t5" fontWeight="medium" color="primary">{row.price}</Text>
                          )
                        },
                      ]}
                      data={data?.zonePrices?.map(p => ({ seat: p.grade, price: `${p.price.toLocaleString()}원` })) || []}
                      isLoading={isLoading}
                    />
                  </div>
                </Box>
              </div>

              {/* 3. 공연 일정 */}
              <div id="schedule" className="scroll-mt-32 transition-all duration-500 ease-in-out w-full">
                <Box variant="flat" padding="large" className="w-full border border-black/5 flex flex-col items-start shadow-sm bg-white rounded-2xl">
                  <div className="w-full flex flex-col items-start gap-4">
                    <Title title="공연 일정" bottomBorder={false} className="!px-0 !pt-0 !pb-2 mb-0 w-full [&>div]:!px-0 [&_h1]:!text-2xl" />
                    <div className="flex flex-col gap-8 w-full mt-2">
                      <div className="w-full flex justify-center">
                        <Calendar
                          enabledDates={enabledDates}
                          selectedDate={selectedDate}
                          onSelect={(date) => setSelectedDate(date ? new Date(date) : null)}
                          isLoading={isLoading}
                        />
                      </div>

                      <div className="w-full">
                        {selectedSchedule ? (
                          <div className="flex flex-col gap-4">
                            <Text typography="t5" fontWeight="bold" color="primary">선택하신 날짜의 회차</Text>
                            <div className="flex flex-wrap gap-3">
                              {selectedSchedule.times.map((timeObj: { time: string, remainingSeats: { grade: string, count: number }[] }, idx: number) => (
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

            {/* 4. 공연 상세 정보 */}
            <div id="details" className="scroll-mt-32 w-full">
              <Box variant="flat" padding="medium" className="w-full border border-black/5">
                <div className="flex flex-col items-start gap-4">
                  <Title title="상세 정보" bottomBorder={true} className="!px-0 !pt-0 !pb-4 mb-1 w-full [&>div]:!px-0 [&_h1]:!text-xl" />
                  {data?.detailImageUrl && (
                    <div className="w-full mt-2 mb-4">
                      <img
                        src={data.detailImageUrl}
                        alt="공연 상세 안내"
                        className="w-full h-auto object-contain rounded-lg border border-black/5"
                      />
                    </div>
                  )}
                </div>
              </Box>
            </div>

          </div>

        </section>

        {/* 전역 푸터 */}
        <Footer />
      </main>

      {/* Booking Pipeline Overlays */}
      {(flowState === 'QUEUE' || flowState === 'WAITLIST_QUEUE' || flowState === 'TEST_WAITLIST_QUEUE') && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <QueueView
            sessionId={data?.eventId || '1'}
            onAdmitted={(token) => {
              setAdmitToken(token);
              if (flowState === 'QUEUE') setFlowState('BOOK');
              else if (flowState === 'TEST_WAITLIST_QUEUE') setFlowState('TEST_WAITLIST_BOOK');
              else setFlowState('WAITLIST_BOOK');
            }}
            onClose={() => setFlowState('NONE')}
            fastMode={flowState === 'TEST_WAITLIST_QUEUE'}
          />
        </div>
      )}
      {(flowState === 'BOOK' || flowState === 'WAITLIST_BOOK' || flowState === 'TEST_WAITLIST_BOOK') && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <BookView eventId={data?.eventId || '1'} mode={(flowState === 'WAITLIST_BOOK' || flowState === 'TEST_WAITLIST_BOOK') ? 'WAITLIST' : 'BOOK'} onClose={() => setFlowState('NONE')} />
        </div>
      )}
    </div>
  );
};
