export interface CancellationOfferDetail {
  offerId: number;
  sessionId: number;
  seatId: number;
  section: string;
  row: string;
  number: string;
  totalPaymentAmount: number;
  offerExpiresAt: string;
}

export interface CancellationPurchaseRequest {
  paymentMethod: 'KAKAOPAY' | 'BANK_TRANSFER';
}

export interface CancellationPurchaseResponse {
  paymentMethod: 'KAKAOPAY' | 'BANK_TRANSFER';
  bookingId: number;
  bookingNo: string;
  orderAmount: number;
  currencyCode: string;
  redirectUrl?: string;
  bankAccount?: string;
  accountHolder?: string;
  depositDeadline?: string;
}

export interface CancellationWaitCandidateCreateRequest {
  sessionSeatIds: number[];
}

export interface CancellationWaitCandidate {
  cancellationCandidateId: number;
  sessionSeatId: number;
  waitingRank: number;
  status: string;
}

export interface CancellationWaitCandidateCreateResponse {
  seats: CancellationWaitCandidate[];
}

export interface CancellationWaitCandidateSummaryResponse {
  cancellationCandidateId: number;
  /**
   * 취소표 제안 식별자. 아직 배정되지 않았으면 없다.
   *
   * 마이페이지가 이 값으로 결제 화면을 열기 때문에 필수다. 서버는 예전부터
   * 내려주고 있었는데 이 타입에만 빠져 있었다(호출부가 any라 드러나지 않았다).
   */
  cancellationOfferId?: number | null;
  eventId: number;
  eventTitle: string;
  scheduleId: number;
  sessionNo: number;
  sessionStartAt: string;
  sessionSeatId: number;
  eventSeatId: number;
  sectionName: string;
  rowLabel: string;
  seatNumber: string;
  seatLabel: string;
  seatGrade: string;
  saleStatus: string;
  currentRank: number;
  status: string;
  createdAt: string;
}

export interface CancellationWaitCandidateListResponse {
  candidates: CancellationWaitCandidateSummaryResponse[];
}
