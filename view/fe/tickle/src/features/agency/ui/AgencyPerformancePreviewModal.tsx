'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import type { IntroImageItem, SeatDiscountDraft, SeatGradeKey, TicketSchedulePreview } from '@/src/features/agency/model/registrationTypes';
import { discountPresetNameMap, formatScheduleDateTimePreviewLabel, seatGradeFields } from '@/src/features/agency/model/registrationHelpers';

/**
 * 등록 직전 공연 정보를 미리 보여주는 모달입니다.
 */
export function AgencyPerformancePreviewModal({
  isOpen,
  onClose,
  title,
  categoryName,
  venueName,
  startAt,
  endAt,
  posterImage,
  introImages,
  notice,
  hashtags,
  seatPrices,
  seatDiscounts,
  schedules,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  categoryName: string;
  venueName: string;
  startAt: Date;
  endAt: Date;
  posterImage: IntroImageItem | null;
  introImages: IntroImageItem[];
  notice: string;
  hashtags: string[];
  seatPrices: Record<SeatGradeKey, string>;
  seatDiscounts: SeatDiscountDraft[];
  schedules: TicketSchedulePreview[];
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const periodLabel = `${dateFormatter.format(startAt)} ~ ${dateFormatter.format(endAt)}`;
  const priceItems = seatGradeFields.map((field) => ({
    ...field,
    price: seatPrices[field.key].trim(),
  }));
  const activeDiscounts = seatDiscounts
    .map((discount) => {
      const name =
        discount.preset === 'custom'
          ? discount.customDiscountName.trim()
          : discountPresetNameMap[discount.preset];
      const rate = discount.discountRate.trim();

      return { name, rate };
    })
    .filter((discount) => discount.name.length > 0 && discount.rate.length > 0);
  const scheduleItems = schedules.slice(0, 8);
  const hiddenScheduleCount = Math.max(0, schedules.length - scheduleItems.length);

  return (
    <div className="fixed inset-0 z-[80] bg-[#f8f8f8] text-slate-950">
      <div className="flex h-full w-full overflow-hidden">
        <aside className="relative hidden h-full w-[38%] min-w-[360px] bg-surface-active lg:block">
          {posterImage ? (
            <Image
              src={posterImage.previewUrl}
              alt="공연 포스터 미리보기"
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-content-tertiary">
              포스터 이미지 없음
            </div>
          )}
        </aside>

        <main className="h-full min-w-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between border-b border-line bg-[#f8f8f8]/95 px-5 py-3 backdrop-blur md:px-10">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-primary">PREVIEW</p>
              <p className="mt-1 text-sm font-bold text-content-tertiary">등록 후 상세 화면 미리보기</p>
            </div>
            <Button color="dark" variant="weak" size="medium" onClick={onClose}>
              닫기
            </Button>
          </div>

          <div className="mx-auto max-w-3xl px-5 pb-16 pt-6 md:px-0">
            <div className="relative mb-6 aspect-[3/4] overflow-hidden rounded-3xl bg-surface-active lg:hidden">
              {posterImage ? (
                <Image
                  src={posterImage.previewUrl}
                  alt="공연 포스터 미리보기"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : null}
            </div>

            <section className="max-w-2xl">
              <div className="flex flex-wrap gap-2">
                {categoryName ? (
                  <Badge color="blue" variant="outline">
                    {categoryName}
                  </Badge>
                ) : null}
                {hashtags.map((hashtag) => (
                  <Badge key={hashtag} color="grey" variant="outline">
                    {hashtag}
                  </Badge>
                ))}
              </div>

              <h1 className="mt-4 whitespace-pre-line text-4xl font-black leading-tight tracking-normal text-slate-950 md:text-6xl">
                {title || '공연명 미입력'}
              </h1>
              <div className="mt-5 space-y-2 text-base font-semibold text-content-secondary md:text-lg">
                <p>{venueName || '공연장 미선택'}</p>
                <p>{periodLabel}</p>
              </div>

              <div className="mt-8 grid w-full max-w-[420px] grid-cols-2 gap-2">
                <Button color="dark" size="large" display="block" disabled>
                  예매하기
                </Button>
                <Button color="light" size="large" display="block" disabled>
                  취소표 대기하기
                </Button>
              </div>
            </section>

            <section className="mt-14 space-y-8 border-t border-line pt-8">
              <Box variant="flat" className="border border-black/5">
                <h2 className="text-xl font-black text-slate-950">공연 정보</h2>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-sm font-bold text-primary">장소</p>
                    <p className="mt-1 text-sm font-semibold text-content-secondary">{venueName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">공지사항</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-content-secondary">
                      {notice.trim() || '등록된 공지사항이 없습니다.'}
                    </p>
                  </div>
                </div>
              </Box>

              <Box variant="flat" className="border border-black/5">
                <h2 className="text-xl font-black text-slate-950">가격 정보</h2>
                <div className="mt-5 overflow-hidden rounded-2xl border border-line-subtle">
                  {priceItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 border-b border-line-subtle px-4 py-3 last:border-b-0"
                    >
                      <Badge color={item.badgeColor} size="small">
                        {item.label}
                      </Badge>
                      <span className="text-sm font-black text-slate-950">
                        {item.price ? `${new Intl.NumberFormat('ko-KR').format(Number(item.price))}원` : '미입력'}
                      </span>
                    </div>
                  ))}
                </div>

                {activeDiscounts.length > 0 ? (
                  <div className="mt-5 rounded-2xl bg-surface-subtle px-4 py-3">
                    <p className="text-sm font-black text-content-secondary">할인 정보</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeDiscounts.map((discount) => (
                        <span
                          key={`${discount.name}-${discount.rate}`}
                          className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-content-secondary ring-1 ring-line"
                        >
                          {discount.name} {discount.rate}%
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Box>

              <Box variant="flat" className="border border-black/5">
                <h2 className="text-xl font-black text-slate-950">공연 일정</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {scheduleItems.map((schedule) => (
                    <div key={schedule.id} className="rounded-2xl border border-line-subtle bg-surface px-4 py-3">
                      <p className="text-sm font-black text-content">
                        {formatScheduleDateTimePreviewLabel(schedule.scheduleAt)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-content-tertiary">
                        예매 {formatScheduleDateTimePreviewLabel(schedule.ticketOpenAt)} 오픈
                      </p>
                    </div>
                  ))}
                </div>
                {hiddenScheduleCount > 0 ? (
                  <p className="mt-4 text-sm font-semibold text-content-tertiary">
                    외 {hiddenScheduleCount}개 회차가 더 있습니다.
                  </p>
                ) : null}
              </Box>

              <Box variant="flat" className="border border-black/5 bg-surface-subtle">
                <h2 className="text-xl font-black text-slate-950">상세 정보</h2>
                {introImages.length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {introImages.map((image, index) => (
                      <div key={image.id} className="relative overflow-hidden rounded-2xl bg-surface">
                        <Image
                          src={image.previewUrl}
                          alt={`공연 소개 이미지 ${index + 1}`}
                          width={1200}
                          height={800}
                          unoptimized
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface text-sm font-bold text-content-muted">
                    상세 이미지 없음
                  </div>
                )}
              </Box>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
