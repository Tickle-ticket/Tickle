'use client';

import { useEffect, useRef } from 'react';
import { cancelPreorder, releaseSeatHold } from '@/src/features/book/api/releaseHold';
import { reservationApi } from '@/src/shared/api/reservationApi';
import { seatApi } from '@/src/shared/api/seatApi';
import { isNavigatingToPaymentFlow } from '@/src/features/book/lib/paymentNavigation';
import { isBlockedNavigation } from '@/src/shared/utils/blockedNavigation';

/**
 * 잡아 둔 좌석을 되돌리는 일을 한곳에서 다룹니다.
 *
 * <p>선점을 되돌리는 방법은 두 가지입니다. 예약 초안(DRAFT)이 만들어졌으면 그
 * 초안을 취소해야 하고, 아직이면 좌석 선점만 풀면 됩니다. 이 판단이 네 군데에
 * 흩어져 있어(뒤로가기·이탈 확인·탭 닫기·언마운트) 한 곳만 빠져도 좌석이 선점
 * 만료 시각까지 잠긴 채 아무도 살 수 없게 됩니다.</p>
 *
 * <p>진행 상태를 ref로 들고 있는 이유는 탭이 닫히는 순간에도 최신 값을 읽어야
 * 하기 때문입니다. 이벤트 리스너는 한 번만 등록되므로 state를 클로저로 잡으면
 * 낡은 값을 보게 됩니다.</p>
 *
 * @param eventId          공연 식별자
 * @param scheduleId       회차 식별자
 * @param preorderBookingId 예약 초안 식별자. 없으면 아직 초안 전이다
 * @param isHoldingSeat    지금 좌석을 잡아 둔 상태인지
 */
export const useSeatHoldRelease = ({
  eventId,
  scheduleId,
  preorderBookingId,
  isHoldingSeat,
}: {
  eventId: string | undefined;
  scheduleId: string | null;
  preorderBookingId: number | null;
  isHoldingSeat: boolean;
}) => {
  const preorderBookingIdRef = useRef<number | null>(null);
  const isHoldingSeatRef = useRef(false);

  useEffect(() => {
    preorderBookingIdRef.current = preorderBookingId;
  }, [preorderBookingId]);

  useEffect(() => {
    isHoldingSeatRef.current = isHoldingSeat;
  }, [isHoldingSeat]);

  useEffect(() => {
    /**
     * 선점을 되돌린다.
     *
     * 이 요청이 서버에 닿지 못하면 좌석이 선점 만료 시각까지 잠긴 채로 남아
     * 아무도 살 수 없다. 그래서 실패를 조용히 넘기지 않고, 앱 안에 남아 있는
     * 경우(언마운트)에는 한 번 더 시도한다.
     *
     * @param isPageClosing 탭 닫기·주소 이동처럼 문서가 사라지는 중인지.
     *                      이 경우 일반 fetch는 취소되므로 keepalive 요청을 쓰고,
     *                      재시도할 시간도 없다.
     */
    const releaseHeldSeat = (isPageClosing = false) => {
      // 결제 성공/카카오페이 리다이렉트 등으로 인한 정상적인 이탈인 경우 방지
      if (isNavigatingToPaymentFlow()) return;

      const bookingId = preorderBookingIdRef.current;
      const canReleaseSeat = isHoldingSeatRef.current && !!eventId && !!scheduleId;

      if (bookingId) {
        if (isPageClosing) {
          // 문서가 사라지는 중이라 재시도할 시간도, 로그를 남길 곳도 없다.
          // keepalive 요청은 브라우저가 이어서 보낸다.
          void reservationApi.cancelReservationOnExit(bookingId).catch(() => {});
        } else {
          cancelPreorder(bookingId);
        }
        return;
      }

      if (!canReleaseSeat) return;

      if (isPageClosing) {
        void seatApi.releaseSeatOnExit(eventId!, scheduleId!).catch(() => {});
      } else {
        releaseSeatHold(eventId!, scheduleId!);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isNormalNavigation = isNavigatingToPaymentFlow();
      const isForceBlockedNavigation = isBlockedNavigation();
      if (isHoldingSeatRef.current && !isNormalNavigation) {
        releaseHeldSeat(true);
        if (isForceBlockedNavigation) return;
        e.preventDefault();
        e.returnValue = ''; // 표준 브라우저 경고창 표시
      }
    };

    // 모바일 브라우저(특히 iOS Safari)는 탭 전환·앱 종료 때 beforeunload를 쏘지
    // 않는다. pagehide는 그 경우에도 발생하므로 좌석이 잠긴 채 방치되지 않도록
    // 함께 듣는다. 두 이벤트가 모두 발생해도 서버는 이미 해제된 좌석을 다시
    // 해제하는 요청을 멱등하게 처리한다.
    const handlePageHide = () => {
      if (isHoldingSeatRef.current || preorderBookingIdRef.current) {
        releaseHeldSeat(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      // 컴포넌트가 언마운트될 때 (사용자가 브라우저 뒤로가기나 모달 닫기를 눌렀을 때)
      releaseHeldSeat();
    };
  }, [eventId, scheduleId]);

  /** 예약 초안을 취소한다. 뒤로가기로 결제 단계를 벗어날 때 쓴다. */
  const cancelDraftIfAny = () => {
    if (!preorderBookingIdRef.current) return false;

    cancelPreorder(preorderBookingIdRef.current);
    preorderBookingIdRef.current = null;
    return true;
  };

  /** 좌석 선점만 푼다. 초안이 만들어지기 전 단계에서 쓴다. */
  const releaseSeatsIfHeld = () => {
    if (!eventId || !scheduleId) return;

    releaseSeatHold(eventId, scheduleId);
    isHoldingSeatRef.current = false;
  };

  return {
    preorderBookingIdRef,
    isHoldingSeatRef,
    cancelDraftIfAny,
    releaseSeatsIfHeld,
  };
};
