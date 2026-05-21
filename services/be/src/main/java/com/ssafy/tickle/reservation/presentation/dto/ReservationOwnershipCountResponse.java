package com.ssafy.tickle.reservation.presentation.dto;

/**
 * 사용자의 회차별 보유/대기 좌석 수 응답 DTO입니다.
 *
 * @param eventId 공연 식별자
 * @param sessionId 회차 식별자
 * @param ownedTicketCount 사용자가 소유한 티켓 수
 * @param cancellationWaitSeatCount 사용자의 활성 취소표 대기 좌석 수
 * @param totalCount 소유 티켓 수와 활성 취소표 대기 좌석 수의 합계
 */
public record ReservationOwnershipCountResponse(
        Long eventId,
        Long sessionId,
        long ownedTicketCount,
        long cancellationWaitSeatCount,
        long totalCount
) {
    /**
     * 보유/대기 좌석 수 응답을 생성합니다.
     *
     * @param eventId 공연 식별자
     * @param sessionId 회차 식별자
     * @param ownedTicketCount 사용자가 소유한 티켓 수
     * @param cancellationWaitSeatCount 사용자의 활성 취소표 대기 좌석 수
     * @return 보유/대기 좌석 수 응답
     */
    public static ReservationOwnershipCountResponse of(
            Long eventId,
            Long sessionId,
            long ownedTicketCount,
            long cancellationWaitSeatCount
    ) {
        return new ReservationOwnershipCountResponse(
                eventId,
                sessionId,
                ownedTicketCount,
                cancellationWaitSeatCount,
                ownedTicketCount + cancellationWaitSeatCount
        );
    }
}
