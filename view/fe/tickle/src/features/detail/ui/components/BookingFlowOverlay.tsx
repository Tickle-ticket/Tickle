'use client';

import { BookView } from '@/src/features/book/ui/BookView';
import { QueueView } from '@/src/features/queue/ui/QueueView';
import type { BookingFlowState } from '@/src/features/detail/hooks/useBookingFlow';

/**
 * 대기열·예매 화면을 상세 위에 전체 화면으로 띄웁니다.
 *
 * <p>예매와 취소표 대기가 같은 화면을 쓰고 scope만 다릅니다. flowState가
 * 어느 쪽인지에 따라 값을 바꿔 넘깁니다.</p>
 *
 * @param flowState        현재 단계. NONE이면 아무것도 그리지 않는다
 * @param eventId          공연 식별자
 * @param admitToken       대기열 통과 토큰
 * @param onQueueAdmitted  대기열 통과
 * @param onTokenFetched   대기열 토큰 발급
 * @param onExit           사용자가 닫음
 * @param onLeaveQueue     결제 완료 등으로 대기열에서만 빠질 때
 */
export const BookingFlowOverlay = ({
  flowState,
  eventId,
  admitToken,
  onQueueAdmitted,
  onTokenFetched,
  onExit,
  onLeaveQueue,
  onStepChange,
  onStepBack,
  onPaymentStart,
}: {
  flowState: BookingFlowState;
  eventId: string | null | undefined;
  admitToken: string | null;
  onQueueAdmitted: (token: string, queueToken?: string) => void;
  onTokenFetched: (token: string | null) => void;
  onExit: () => void;
  onLeaveQueue: () => void;
  onStepChange: (step: string) => void;
  onStepBack: (targetStep: string) => void;
  onPaymentStart: () => void;
}) => {
  const isQueue = flowState === 'QUEUE' || flowState === 'WAITLIST_QUEUE';
  const isBooking = flowState === 'BOOK' || flowState === 'WAITLIST_BOOK';

  if (!isQueue && !isBooking) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-surface overflow-y-auto">
      {isQueue ? (
        <QueueView
          eventId={eventId ?? ''}
          scope={flowState === 'WAITLIST_QUEUE' ? 'CANCELLATION_WAIT' : 'BOOKING'}
          onAdmitted={onQueueAdmitted}
          onClose={onExit}
          onTokenFetched={onTokenFetched}
        />
      ) : (
        <BookView
          eventId={eventId ?? undefined}
          mode={flowState === 'WAITLIST_BOOK' ? 'WAITLIST' : 'BOOK'}
          admitToken={admitToken || undefined}
          onClose={onExit}
          onLeaveQueue={onLeaveQueue}
          onStepChange={onStepChange}
          onStepBack={onStepBack}
          onPaymentStart={onPaymentStart}
        />
      )}
    </div>
  );
};
