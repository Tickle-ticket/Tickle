'use client';

import { BookButton } from '@/src/shared/components/BookButton';
import { WaitlistButton } from '@/src/shared/components/WaitlistButton';

/** 취소표 대기는 예매 오픈 10분 뒤에 열린다. */
const WAITLIST_OPEN_DELAY_MS = 10 * 60 * 1000;

/**
 * 상세 화면 하단의 예매·취소표 대기·찜하기 버튼입니다.
 *
 * @param openDate                예매 오픈 시각
 * @param isUpcoming              예매가 아직 열리지 않았는지
 * @param isMoreThanOneDayLeft    예매 오픈까지 하루 넘게 남았는지
 * @param isWaitlistUpcoming      취소표 대기가 아직 열리지 않았는지
 * @param isWaitlistMoreThanOneDayLeft 취소표 대기까지 하루 넘게 남았는지
 * @param isFavorite              찜한 공연인지
 * @param onStartBooking          예매하기
 * @param onStartWaitlist         취소표 대기하기
 * @param onToggleFavorite        찜 토글
 */
export const DetailActionButtons = ({
  openDate,
  isUpcoming,
  isMoreThanOneDayLeft,
  isWaitlistUpcoming,
  isWaitlistMoreThanOneDayLeft,
  isFavorite,
  isLoading,
  bookBtnTracker,
  waitlistBtnTracker,
  onStartBooking,
  onStartWaitlist,
  onToggleFavorite,
}: {
  openDate: string | null | undefined;
  isUpcoming: boolean;
  isMoreThanOneDayLeft: boolean;
  isWaitlistUpcoming: boolean;
  isWaitlistMoreThanOneDayLeft: boolean;
  isFavorite: boolean;
  isLoading: boolean;
  bookBtnTracker: React.ComponentProps<typeof BookButton>['trackerProps'];
  waitlistBtnTracker: React.ComponentProps<typeof WaitlistButton>['trackerProps'];
  onStartBooking: () => void;
  onStartWaitlist: () => void;
  onToggleFavorite: () => void;
}) => (
  <div className="flex items-center gap-3 w-full">
    {/* 예약 버튼 묶음 */}
    <div className="flex items-center flex-1 gap-2">

      {/* 예매하기 버튼 */}
      <BookButton
        trackerProps={bookBtnTracker}
        isUpcoming={isUpcoming}
        isMoreThanOneDayLeft={isMoreThanOneDayLeft}
        targetDate={openDate || undefined}
        onClick={() => !isUpcoming && onStartBooking()}
        isLoading={isLoading}
      />

      {/* 취소표 대기하기 버튼 */}
      <WaitlistButton
        trackerProps={waitlistBtnTracker}
        isUpcoming={isWaitlistUpcoming}
        isMoreThanOneDayLeft={isWaitlistMoreThanOneDayLeft}
        targetDate={
          openDate
            ? new Date(new Date(openDate).getTime() + WAITLIST_OPEN_DELAY_MS).toISOString()
            : undefined
        }
        onClick={() => !isWaitlistUpcoming && onStartWaitlist()}
        isLoading={isLoading}
      />

    </div>

    {/* 찜하기 버튼 */}
    <button
      onClick={onToggleFavorite}
      className={`w-14 h-14 flex items-center justify-center rounded-xl border transition-colors shadow-sm shrink-0 ${isFavorite ? 'border-danger-light bg-danger-subtle' : 'border-line bg-surface hover:bg-surface-subtle'}`}
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
);
