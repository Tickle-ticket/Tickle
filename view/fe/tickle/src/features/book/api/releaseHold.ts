import { seatApi } from '@/src/shared/api/seatApi';
import { reservationApi } from '@/src/shared/api/reservationApi';

/**
 * 좌석 선점·예매 초안을 되돌립니다.
 *
 * <p>이 요청이 서버에 닿지 못하면 좌석이 선점 만료 시각까지 잠긴 채로 남아
 * 아무도 살 수 없습니다. 그래서 실패를 조용히 넘기지 않고 한 번 더 시도한 뒤,
 * 그래도 안 되면 무엇이 잠겼는지 로그로 남깁니다.</p>
 *
 * <p>사용자에게는 알리지 않습니다 — 이미 다른 화면으로 이동하는 중이고, 사용자가
 * 할 수 있는 일도 없습니다. 잠긴 좌석은 서버가 만료로 회수합니다.</p>
 */

/** 실패한 해제 요청을 한 번 더 보낸 뒤, 그래도 실패하면 로그만 남긴다. */
const retryOnce = (
  attempt: () => Promise<unknown>,
  failureContext: string,
): void => {
  attempt()
    .catch(() => attempt())
    .catch((error) => {
      console.error(
        `[Book] ${failureContext} — 좌석이 선점 만료까지 잠길 수 있음`,
        error,
      );
    });
};

/**
 * 좌석 선점을 해제합니다(화면 안에서의 이동용).
 *
 * @param eventId    공연 식별자
 * @param scheduleId 회차 식별자
 */
export const releaseSeatHold = (
  eventId: string | number,
  scheduleId: string | number,
): void => {
  retryOnce(() => seatApi.releaseSeat(eventId, scheduleId), '좌석 선점 해제 실패');
};

/**
 * 예매 초안을 취소합니다(화면 안에서의 이동용).
 *
 * <p>초안이 남으면 거기 묶인 좌석도 함께 잠깁니다.</p>
 *
 * @param bookingId 예매 초안 식별자
 */
export const cancelPreorder = (bookingId: string | number): void => {
  retryOnce(
    () => reservationApi.cancelReservation(bookingId),
    '예매 초안 취소 실패',
  );
};
