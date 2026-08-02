import { http, HttpResponse, delay } from 'msw';
import type {
  CancellationPurchaseRequest,
  CancellationWaitCandidate,
  CancellationWaitCandidateCreateRequest,
  CancellationWaitCandidateSummaryResponse,
} from '@/src/shared/api/types/cancellation.types';

const API_BASE_URL = '*/api/v1';

/** 취소표 좌석 한 자리 값. 화면이 "VIP석 A열 12번"처럼 조립한다. */
const TICKET_PRICE = 90000;

/**
 * 대기 신청 목록.
 *
 * <p>모듈 스코프에 두어 신청·취소·패스가 실제로 반영되게 한다. 매번 고정된
 * 배열을 돌려주면 취소를 눌러도 목록이 그대로라 흐름을 확인할 수 없다.</p>
 *
 * <p>한 건은 OFFERED로 둔다. 배정된 취소표가 있어야 구매·패스 화면까지
 * 눌러 볼 수 있다.</p>
 */
let waitCandidates: CancellationWaitCandidateSummaryResponse[] = [
  {
    cancellationCandidateId: 9001,
    cancellationOfferId: 7001,
    eventId: 1,
    eventTitle: '오페라의 유령',
    scheduleId: 101,
    sessionNo: 1,
    sessionStartAt: '2026-09-15T19:30:00Z',
    sessionSeatId: 3401,
    eventSeatId: 3401,
    sectionName: 'VIP석',
    rowLabel: 'A',
    seatNumber: '12',
    seatLabel: 'A-12',
    seatGrade: 'VIP',
    saleStatus: 'CANCELLED',
    currentRank: 1,
    status: 'OFFERED',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    cancellationCandidateId: 9002,
    cancellationOfferId: null,
    eventId: 1,
    eventTitle: '오페라의 유령',
    scheduleId: 101,
    sessionNo: 1,
    sessionStartAt: '2026-09-15T19:30:00Z',
    sessionSeatId: 3402,
    eventSeatId: 3402,
    sectionName: 'VIP석',
    rowLabel: 'A',
    seatNumber: '13',
    seatLabel: 'A-13',
    seatGrade: 'VIP',
    saleStatus: 'AVAILABLE',
    currentRank: 3,
    status: 'WAITING',
    createdAt: '2026-08-01T10:00:00Z',
  },
];

let nextCandidateId = 9100;

export const cancellationHandlers = [
  // 예매 대기 신청
  //
  // 좌석마다 대기 순번을 하나씩 만든다. 신청 직후에는 배정 전이므로
  // cancellationOfferId 없이 WAITING으로 둔다.
  http.post(
    `${API_BASE_URL}/events/:eventId/schedules/:scheduleId/cancellation-wait/candidates`,
    async ({ request, params }) => {
      await delay(300);
      const body = (await request
        .json()
        .catch(() => null)) as CancellationWaitCandidateCreateRequest | null;
      const sessionSeatIds = body?.sessionSeatIds ?? [];

      const created: CancellationWaitCandidate[] = sessionSeatIds.map((sessionSeatId, index) => {
        const candidateId = nextCandidateId;
        nextCandidateId += 1;

        waitCandidates.push({
          cancellationCandidateId: candidateId,
          cancellationOfferId: null,
          eventId: Number(params.eventId),
          eventTitle: '오페라의 유령',
          scheduleId: Number(params.scheduleId),
          sessionNo: 1,
          sessionStartAt: '2026-09-15T19:30:00Z',
          sessionSeatId,
          eventSeatId: sessionSeatId,
          sectionName: 'VIP석',
          rowLabel: 'B',
          seatNumber: String(index + 1),
          seatLabel: `B-${index + 1}`,
          seatGrade: 'VIP',
          saleStatus: 'AVAILABLE',
          currentRank: 2 + index,
          status: 'WAITING',
          createdAt: new Date().toISOString(),
        });

        return {
          cancellationCandidateId: candidateId,
          sessionSeatId,
          waitingRank: 2 + index,
          status: 'WAITING',
        };
      });

      return HttpResponse.json({
        status: 200,
        code: 'OK',
        message: 'success',
        data: { seats: created },
      });
    },
  ),

  // 예매 대기 신청 목록 조회
  http.get(`${API_BASE_URL}/cancellation-wait/candidates`, async () => {
    await delay(300);
    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: { candidates: waitCandidates },
    });
  }),

  // 예매 대기 신청 취소
  http.delete(`${API_BASE_URL}/cancellation-wait/candidates/:candidateId`, async ({ params }) => {
    await delay(300);
    const candidateId = Number(params.candidateId);
    waitCandidates = waitCandidates.filter(
      (candidate) => candidate.cancellationCandidateId !== candidateId,
    );

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null,
    });
  }),

  // 취소표 제안 상세 조회
  http.get(`${API_BASE_URL}/cancellations/:cancellationId`, async ({ params }) => {
    await delay(300);
    const offerId = Number(params.cancellationId);
    const matched = waitCandidates.find(
      (candidate) => candidate.cancellationOfferId === offerId,
    );

    // 서버는 티켓가와 수수료를 합쳐 총액만 내려준다(CancellationOfferDetailResponse).
    const serviceFee = Math.floor(TICKET_PRICE * 0.05);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        offerId,
        sessionId: matched?.scheduleId ?? 101,
        seatId: matched?.sessionSeatId ?? 3401,
        section: matched?.sectionName ?? 'VIP석',
        row: matched?.rowLabel ?? 'A',
        number: matched?.seatNumber ?? '12',
        totalPaymentAmount: TICKET_PRICE + serviceFee,
        // 10분 안에 결제하지 않으면 다음 대기자에게 넘어간다.
        offerExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    });
  }),

  // 취소표 구매
  http.post(`${API_BASE_URL}/cancellations/:cancellationId/purchase`, async ({ request }) => {
    await delay(300);
    const body = (await request
      .json()
      .catch(() => null)) as CancellationPurchaseRequest | null;
    const paymentMethod = body?.paymentMethod ?? 'BANK_TRANSFER';
    const serviceFee = Math.floor(TICKET_PRICE * 0.05);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        paymentMethod,
        bookingId: 5002,
        bookingNo: 'BK-CANCEL-5002',
        orderAmount: TICKET_PRICE + serviceFee,
        currencyCode: 'KRW',
        ...(paymentMethod === 'KAKAOPAY'
          ? { redirectUrl: '/payment/success?bookingId=5002&method=kakaopay' }
          : {
              bankAccount: '110-482-129438',
              accountHolder: 'tickle',
              depositDeadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            }),
      },
    });
  }),

  // 취소표 제안 패스
  //
  // 배정을 거절하면 다시 대기 상태로 돌아간다. 목록에서 사라지지는 않는다.
  http.post(`${API_BASE_URL}/cancellations/:cancellationId/pass`, async ({ params }) => {
    await delay(300);
    const offerId = Number(params.cancellationId);
    waitCandidates = waitCandidates.map((candidate) =>
      candidate.cancellationOfferId === offerId
        ? { ...candidate, cancellationOfferId: null, status: 'WAITING' }
        : candidate,
    );

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: null,
    });
  }),
];
