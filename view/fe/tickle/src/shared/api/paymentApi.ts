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
  depositDeadline: string;
  bankAccount: string;
  accountHolder: string;
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
  depositDeadline: Schema.String,
  bankAccount: Schema.String,
  accountHolder: Schema.String,
  seats: Schema.Array(PaymentSeatSummarySchema),
});

export const paymentApi = {
  confirmBankTransferPayment: async (
    eventId: number | string,
    scheduleId: number | string,
    request: BankTransferPrepareRequest
  ): Promise<ApiResponse<BankTransferPrepareResponse>> => {
    return apiClient<ApiResponse<BankTransferPrepareResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/payments/bank-transfer`,
      {
        method: 'POST',
        data: request,
      },
      true,
      createApiResponseSchema(BankTransferPrepareResponseSchema)
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
