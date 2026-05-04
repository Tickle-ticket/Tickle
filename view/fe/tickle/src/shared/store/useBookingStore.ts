import { create } from 'zustand';

interface OptionSelection {
  sessionSeatId: number;
  discountName: string | null;
}

interface BookingState {
  // 예약 기본 정보
  eventId: number | null;
  sessionId: number | null;
  userId: number | null;
  
  // 1. 좌석 선점 상태
  heldSessionSeatIds: number[];
  holdExpiresAt: string | null;

  // 2. 권종 선택 상태
  selectedOptions: OptionSelection[];

  // 3. 예매 초안 상태
  bookingId: number | null;
  bookingNo: string | null;
  bookingStatus: string | null;
  totalPaymentAmount: number | null;

  // 4. 결제 대기(무통장 입금) 상태
  paymentId: number | null;
  paymentStatus: string | null;
  depositDeadline: string | null;
  bankAccount: string | null;
  accountHolder: string | null;

  // Actions
  setEventInfo: (eventId: number, sessionId: number, userId: number) => void;
  setHoldInfo: (heldSessionSeatIds: number[], holdExpiresAt: string) => void;
  setSelectedOptions: (options: OptionSelection[]) => void;
  setBookingDraftInfo: (bookingId: number, bookingNo: string, bookingStatus: string, totalAmount: number) => void;
  setPaymentInfo: (paymentId: number, paymentStatus: string, deadline: string, account: string, holder: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  eventId: null,
  sessionId: null,
  userId: null,
  
  heldSessionSeatIds: [],
  holdExpiresAt: null,
  
  selectedOptions: [],
  
  bookingId: null,
  bookingNo: null,
  bookingStatus: null,
  totalPaymentAmount: null,
  
  paymentId: null,
  paymentStatus: null,
  depositDeadline: null,
  bankAccount: null,
  accountHolder: null,

  setEventInfo: (eventId, sessionId, userId) => set({ eventId, sessionId, userId }),
  setHoldInfo: (heldSessionSeatIds, holdExpiresAt) => set({ heldSessionSeatIds, holdExpiresAt }),
  setSelectedOptions: (selectedOptions) => set({ selectedOptions }),
  setBookingDraftInfo: (bookingId, bookingNo, bookingStatus, totalPaymentAmount) => 
    set({ bookingId, bookingNo, bookingStatus, totalPaymentAmount }),
  setPaymentInfo: (paymentId, paymentStatus, depositDeadline, bankAccount, accountHolder) => 
    set({ paymentId, paymentStatus, depositDeadline, bankAccount, accountHolder }),
  reset: () => set({
    eventId: null, sessionId: null, userId: null,
    heldSessionSeatIds: [], holdExpiresAt: null,
    selectedOptions: [],
    bookingId: null, bookingNo: null, bookingStatus: null, totalPaymentAmount: null,
    paymentId: null, paymentStatus: null, depositDeadline: null, bankAccount: null, accountHolder: null
  })
}));
