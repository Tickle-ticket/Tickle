'use client';

import Image from 'next/image';
import { Box } from '@/src/shared/components/Box';
import { Title } from '@/src/shared/components/Title';
import { Text } from '@/src/shared/components/Text';
import { Table } from '@/src/shared/components/Table';
import { Calendar } from '@/src/shared/components/Calendar';
import { SectionNav } from '@/src/shared/components/SectionNav';
import { useImageFallback } from '@/src/shared/hooks/useImageFallback';
import type { DetailData } from '@/src/features/detail/api/useDetailData';

/**
 * 공연 상세 화면의 본문(공연 정보·가격·일정·상세 이미지)입니다.
 *
 * <p>본문은 data와 일정 선택 외에 의존하는 것이 없어, 대기열·예매 흐름 상태와
 * 섞여 있던 것을 그대로 떼어냈습니다.</p>
 *
 * @param data           상세 데이터
 * @param navItems       섹션 이동 탭 항목
 * @param activeIndex    현재 보고 있는 섹션
 * @param handleScrollTo 탭 클릭 시 해당 섹션으로 이동
 * @param selectedDate   달력에서 고른 날짜
 * @param setSelectedDate 날짜 선택
 */
/** 달력 비교에 쓰는 YYYY.MM.DD 형식으로 바꾼다. */
const formatDateToDot = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

export const DetailContentSection = ({
  data,
  navItems,
  activeIndex,
  handleScrollTo,
  selectedDate,
  setSelectedDate,
}: {
  data: DetailData | undefined;
  navItems: { id: string; title: string }[];
  activeIndex: number;
  handleScrollTo: (id: string, index: number) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}) => {
  const scheduleData = data?.schedules || [];
  const enabledDates = scheduleData.map((item) => item.date.split(' ')[0].replace(/\./g, '-'));
  const selectedDateStr = selectedDate ? formatDateToDot(selectedDate) : '';
  const selectedSchedule = scheduleData.find((item) => item.date.startsWith(selectedDateStr));

  // 예전에는 실패 여부를 DetailView의 state로 들고 있었다. src가 바뀌어도
  // 초기화되지 않아, 한 번 실패하면 다른 공연으로 옮겨도 계속 폴백이었다.
  const {
    resolvedSrc: detailImageSrc,
    showFallback: showDetailImageFallback,
    onError: handleDetailImageError,
  } = useImageFallback(data?.detailImageUrl);

  return (
    <section className="mt-16 flex flex-col gap-8 border-t border-black/10 relative items-start">
      <div className="sticky top-0 z-40 w-full bg-[#f8f8f8]/95 backdrop-blur-md py-3 lg:py-4 px-4 lg:px-0 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] lg:shadow-none">
        <div className="w-full max-w-3xl mx-auto">
          <SectionNav
            items={navItems}
            activeIndex={activeIndex}
            onItemClick={(id: string, index: number) => handleScrollTo(id, index)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
        {/* 1. 공연 정보 */}
        <div id="info" className="scroll-mt-48 w-full">
          <Box variant="flat" padding="medium" className="w-full border border-black/5">
            <div className="flex flex-col items-start gap-4">
              <Title title="공연 정보" bottomBorder={true} className="!px-0 !pt-0 !pb-4 mb-1 w-full [&>div]:!px-0 [&_h1]:!text-xl" />
              <div className="w-full">
                <Table
                  columns={[
                    { key: 'label', header: '', align: 'left', width: '90px', render: (row) => row.label },
                    { key: 'value', header: '', align: 'left', render: (row) => row.value }
                  ]}
                  data={[
                    {
                      label: <Text typography="t5" color="secondary" fontWeight="medium" className="whitespace-nowrap">카테고리</Text>,
                      value: <Text typography="t4" color="primary" fontWeight="bold">{data?.subTitle || ''}</Text>
                    },
                    {
                      label: <Text typography="t5" color="secondary" fontWeight="medium" className="whitespace-nowrap">공연 기간</Text>,
                      value: <Text typography="t4" color="primary" fontWeight="bold">{data?.startDate ? `${data?.startDate} ~ ${data?.endDate}` : ''}</Text>
                    },
                    {
                      label: <Text typography="t5" color="secondary" fontWeight="medium" className="whitespace-nowrap">장소</Text>,
                      value: (
                        <div className="flex flex-col">
                          <Text typography="t4" color="primary" fontWeight="bold">{data?.venue || ''}</Text>
                          {data?.venueAddress && <Text typography="t5" color="secondary">{data?.venueAddress}</Text>}
                        </div>
                      )
                    },
                    {
                      label: <Text typography="t5" color="secondary" fontWeight="medium" className="whitespace-nowrap">공지사항</Text>,
                      value: (
                        <div className="flex flex-col gap-0.5">
                          {data?.notice?.split('\n').map((desc, dIdx) => desc && (
                            <Text key={dIdx} typography="t4" color="primary" fontWeight="bold">{desc}</Text>
                          ))}
                        </div>
                      )
                    }
                  ]}
                  className="[&_thead]:hidden [&_tbody_tr]:!bg-transparent hover:[&_tbody_tr]:!bg-surface-subtle/50 [&_td]:!py-3 [&_td]:!px-2 [&_td]:!border-b-0 [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-line-subtle"
                />
              </div>
            </div>
          </Box>
        </div>

        <div className="flex flex-col gap-8 w-full">
          {/* 2. 가격 */}
          <div id="price" className="scroll-mt-48 transition-all duration-500 ease-in-out w-full">
            <Box variant="flat" padding="large" className="w-full border border-black/5 flex flex-col gap-4 shadow-sm bg-surface rounded-2xl">
              <Title title="가격 정보" bottomBorder={false} className="!px-0 !pt-0 !pb-2 mb-0 w-full [&>div]:!px-0 [&_h1]:!text-2xl shrink-0" />
              <div className="w-full rounded-xl overflow-hidden border border-line-subtle">
                <Table
                  columns={[
                    {
                      key: 'seat',
                      header: '좌석 등급',
                      align: 'left',
                      render: (row) => {
                        const gradeColors: Record<string, string> = {
                          'VIP': 'var(--seat-vip-top)',
                          'R': 'var(--seat-r-top)',
                          'S': 'var(--seat-s-top)',
                          'A': 'var(--seat-a-top)',
                        };
                        return (
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: gradeColors[row.priceGrade] || 'var(--color-surface-active)' }} />
                            <Text typography="t5" fontWeight="bold" color="primary">{row.priceGrade}</Text>
                          </div>
                        );
                      }
                    },
                    {
                      key: 'price',
                      header: '가격',
                      align: 'right',
                      render: (row) => (
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
          <div id="schedule" className="scroll-mt-48 transition-all duration-500 ease-in-out w-full">
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
                          {selectedSchedule.times.map((timeObj, idx) => (
                            <div
                              key={idx}
                              className="inline-flex flex-col items-center justify-center px-6 py-3 border border-line rounded-xl bg-surface"
                            >
                              <Text typography="t4" fontWeight="bold" color="primary">{timeObj.time}</Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 border border-dashed border-line-strong rounded-xl bg-surface-subtle/50">
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
        <div id="details" className="scroll-mt-48 w-full mt-8">
          <Box variant="flat" padding="medium" className="w-full border border-black/5 bg-surface-subtle flex flex-col items-center justify-center min-h-[500px] overflow-hidden rounded-xl">
            {!showDetailImageFallback ? (
              <Image
                src={detailImageSrc}
                alt="상세 정보"
                width={0}
                height={0}
                sizes="100vw"
                style={{ width: '100%', height: 'auto' }}
                className="w-full h-auto object-cover rounded-xl"
                unoptimized={true}
                onError={handleDetailImageError}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-content-muted">
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
  );
};
