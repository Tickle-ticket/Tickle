import { apiClient } from './client';
import { ApiResponse } from './types';
import { Schema } from 'effect';
import { createApiResponseSchema } from '../utils/schema';

export interface PaymentSeatSummary {
  sessionSeatId: number;
  seatLabel: string;
  rowLabel: string;
  seatNumber: string;
  ticketPriceAmount: number;
  serviceFeeAmount: number;
  finalPriceAmount: number;
}

export const PaymentSeatSummarySchema = Schema.Struct({
  sessionSeatId: Schema.Number,
  seatLabel: Schema.String,
  rowLabel: Schema.String,
  seatNumber: Schema.String,
  ticketPriceAmount: Schema.Number,
  serviceFeeAmount: Schema.Number,
  finalPriceAmount: Schema.Number,
});

export interface PaymentMethodSelectionRequest {
  bookingId: number;
  paymentMethod: 'BANK_TRANSFER' | 'KAKAOPAY';
}

export interface PaymentMethodSelectionResponse {
  bookingId: number;
  paymentMethod: 'BANK_TRANSFER' | 'KAKAOPAY';
  nextAction: 'PREPARE_BANK_TRANSFER' | 'PREPARE_KAKAOPAY';
}

export const PaymentMethodSelectionResponseSchema = Schema.Struct({
  bookingId: Schema.Number,
  paymentMethod: Schema.Literal('BANK_TRANSFER', 'KAKAOPAY'),
  nextAction: Schema.Literal('PREPARE_BANK_TRANSFER', 'PREPARE_KAKAOPAY'),
});

export interface KakaoPayReadyRequest {
  bookingId: number;
}

export interface KakaoPayReadyResponse {
  tid: string;
  nextRedirectPcUrl: string;
  createdAt: string;
}

export const KakaoPayReadyResponseSchema = Schema.Struct({
  tid: Schema.String,
  nextRedirectPcUrl: Schema.String,
  createdAt: Schema.String,
});

export interface BankTransferPrepareRequest {
  bookingId: number;
}

export interface BankTransferPrepareResponse {
  paymentId: number;
  bookingId: number;
  bookingNo: string;
  paymentStatus: string;
  bookingStatus: string;
  orderAmount: number;
  currencyCode: string;
  bankAccount: string;
  accountHolder: string;
  depositDeadline: string;
  seats: PaymentSeatSummary[];
}

export const BankTransferPrepareResponseSchema = Schema.Struct({
  paymentId: Schema.Number,
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  paymentStatus: Schema.String,
  bookingStatus: Schema.String,
  orderAmount: Schema.Number,
  currencyCode: Schema.String,
  bankAccount: Schema.String,
  accountHolder: Schema.String,
  depositDeadline: Schema.String,
  seats: Schema.Array(PaymentSeatSummarySchema),
});

export interface PaymentStatusResponse {
  paymentId: number;
  bookingId: number;
  bookingNo: string;
  paymentMethodType: string;
  paymentStatus: string;
  bookingStatus: string;
  orderAmount: number;
  currencyCode: string;
  depositDeadline: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
  seats: PaymentSeatSummary[];
}

export const PaymentStatusResponseSchema = Schema.Struct({
  paymentId: Schema.Number,
  bookingId: Schema.Number,
  bookingNo: Schema.String,
  paymentMethodType: Schema.String,
  paymentStatus: Schema.String,
  bookingStatus: Schema.String,
  orderAmount: Schema.Number,
  currencyCode: Schema.String,
  depositDeadline: Schema.NullOr(Schema.String),
  bankAccount: Schema.NullOr(Schema.String),
  accountHolder: Schema.NullOr(Schema.String),
  seats: Schema.Array(PaymentSeatSummarySchema),
});

export const paymentApi = {
  selectPaymentMethod: async (
    eventId: number | string,
    scheduleId: number | string,
    userId: number | string,
    request: PaymentMethodSelectionRequest
  ): Promise<ApiResponse<PaymentMethodSelectionResponse>> => {
    return apiClient<ApiResponse<PaymentMethodSelectionResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/payments/select-method?userId=${userId}`,
      {
        method: 'POST',
        body: request,
      },
      true,
      createApiResponseSchema(PaymentMethodSelectionResponseSchema)
    );
  },

  confirmBankTransferPayment: async (
    eventId: number | string,
    scheduleId: number | string,
    userId: number | string,
    request: BankTransferPrepareRequest
  ): Promise<ApiResponse<BankTransferPrepareResponse>> => {
    return apiClient<ApiResponse<BankTransferPrepareResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/payments/bank-transfer?userId=${userId}`,
      {
        method: 'POST',
        body: request,
      },
      true,
      createApiResponseSchema(BankTransferPrepareResponseSchema)
    );
  },

  readyKakaoPay: async (
    eventId: number | string,
    scheduleId: number | string,
    userId: number | string,
    request: KakaoPayReadyRequest
  ): Promise<ApiResponse<KakaoPayReadyResponse>> => {
    return apiClient<ApiResponse<KakaoPayReadyResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/payments/kakaopay/ready?userId=${userId}`,
      {
        method: 'POST',
        body: request,
      },
      true,
      createApiResponseSchema(KakaoPayReadyResponseSchema)
    );
  },

  getPaymentStatus: async (
    paymentId: number | string
  ): Promise<ApiResponse<PaymentStatusResponse>> => {
    return apiClient<ApiResponse<PaymentStatusResponse>>(
      `/api/v1/payments/${paymentId}`,
      {
        method: 'GET',
      },
      true,
      createApiResponseSchema(PaymentStatusResponseSchema)
    );
  },
};
