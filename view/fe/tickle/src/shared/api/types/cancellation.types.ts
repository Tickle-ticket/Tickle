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
