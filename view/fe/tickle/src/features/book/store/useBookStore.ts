import { create } from 'zustand';

export type BookingStep = 'SEAT' | 'TICKET_TYPE' | 'PAYMENT' | 'PAY_METHOD';
export type PayCategory = 'pay' | 'other' | null;

export interface Schedule {
  date: string;
  time: string;
  scheduleId?: string;
}

interface BookingState {
  // Step
  bookingStep: BookingStep;
  setBookingStep: (step: BookingStep) => void;

  // CAPTCHA
  // 예매 진입 전 사람임을 증명했는지 여부. 컴포넌트 지역 상태로 두면 예매 단계를
  // 밖에서 지정할 수 없어(Storybook·테스트) store로 올렸다. 실제 판정은 서버가
  // 하며 이 값은 화면 전환용 플래그다.
  isBotVerified: boolean;
  setIsBotVerified: (verified: boolean) => void;

  // Schedule
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
  confirmedSchedule: Schedule | null;
  setConfirmedSchedule: (schedule: Schedule | null) => void;
  isModifyingSchedule: boolean;
  setIsModifyingSchedule: (isModifying: boolean) => void;

  // Seats
  selectedSeats: Set<string>;
  toggleSeat: (seatId: string) => void;
  setSelectedSeats: (seats: Set<string>) => void;
  selectedSeatsToCancel: Set<string>;
  toggleCancelSeat: (seatId: string) => void;
  setSelectedSeatsToCancel: (seats: Set<string>) => void;
  isModifyModeActive: boolean;
  setIsModifyModeActive: (isActive: boolean) => void;

  // Ticket Types (counts per grade per type)
  // e.g. { 'R': { 'adult': 2, 'child': 1 } }
  priceGradeTicketCounts: Record<string, Record<string, number>>;
  setPriceGradeTicketCounts: (counts: Record<string, Record<string, number>> | ((prev: Record<string, Record<string, number>>) => Record<string, Record<string, number>>)) => void;

  // Pending option selections (saved from TicketTypeStep, consumed by PaymentStep)
  pendingOptionSelections: { seatIds: number[]; optionSelections: { sessionSeatId: number; discountName: string }[] } | null;
  setPendingOptionSelections: (selections: { seatIds: number[]; optionSelections: { sessionSeatId: number; discountName: string }[] } | null) => void;

  // Payment Form
  buyerName: string;
  setBuyerName: (name: string) => void;
  buyerEmail: string;
  setBuyerEmail: (email: string) => void;
  buyerPhone: string;
  setBuyerPhone: (phone: string) => void;
  
  agreeAll: boolean;
  setAgreeAll: (agree: boolean) => void;
  agreeTerm1: boolean;
  setAgreeTerm1: (agree: boolean) => void;
  agreeTerm2: boolean;
  setAgreeTerm2: (agree: boolean) => void;

  payCategory: PayCategory;
  setPayCategory: (category: PayCategory) => void;
  selectedPayMethod: string | null;
  setSelectedPayMethod: (method: string | null) => void;

  // Reset
  resetStore: (initialValues?: Partial<BookingState>) => void;
}

const initialState = {
  bookingStep: 'SEAT' as BookingStep,
  isBotVerified: false,
  selectedDate: null,
  selectedTime: null,
  confirmedSchedule: null,
  isModifyingSchedule: false,
  selectedSeats: new Set<string>(),
  selectedSeatsToCancel: new Set<string>(),
  isModifyModeActive: false,
  priceGradeTicketCounts: {},
  pendingOptionSelections: null,
  buyerName: '',
  buyerEmail: '',
  buyerPhone: '',
  agreeAll: false,
  agreeTerm1: false,
  agreeTerm2: false,
  payCategory: null as PayCategory,
  selectedPayMethod: null,
};

export const useBookStore = create<BookingState>((set, get) => ({
  ...initialState,

  setBookingStep: (step) => set({ bookingStep: step }),
  setIsBotVerified: (verified) => set({ isBotVerified: verified }),


  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedTime: (time) => set({ selectedTime: time }),
  setConfirmedSchedule: (schedule) => set({ confirmedSchedule: schedule }),
  setIsModifyingSchedule: (isModifying) => set({ isModifyingSchedule: isModifying }),

  toggleSeat: (seatId) => set((state) => {
    const next = new Set(state.selectedSeats);
    if (next.has(seatId)) next.delete(seatId);
    else next.add(seatId);
    return { selectedSeats: next };
  }),
  setSelectedSeats: (seats) => set({ selectedSeats: seats }),

  toggleCancelSeat: (seatId) => set((state) => {
    const next = new Set(state.selectedSeatsToCancel);
    if (next.has(seatId)) next.delete(seatId);
    else next.add(seatId);
    return { selectedSeatsToCancel: next };
  }),
  setSelectedSeatsToCancel: (seats) => set({ selectedSeatsToCancel: seats }),
  
  setIsModifyModeActive: (isActive) => set({ isModifyModeActive: isActive }),

  setPriceGradeTicketCounts: (updater) => set((state) => ({
    priceGradeTicketCounts: typeof updater === 'function' ? updater(state.priceGradeTicketCounts) : updater
  })),

  setPendingOptionSelections: (selections) => set({ pendingOptionSelections: selections }),

  setBuyerName: (name) => set({ buyerName: name }),
  setBuyerEmail: (email) => set({ buyerEmail: email }),
  setBuyerPhone: (phone) => set({ buyerPhone: phone }),

  setAgreeAll: (agree) => set({ agreeAll: agree }),
  setAgreeTerm1: (agree) => set({ agreeTerm1: agree }),
  setAgreeTerm2: (agree) => set({ agreeTerm2: agree }),

  setPayCategory: (category) => set({ payCategory: category }),
  setSelectedPayMethod: (method) => set({ selectedPayMethod: method }),

  resetStore: (initialValues = {}) => set({ ...initialState, ...initialValues }),
}));
