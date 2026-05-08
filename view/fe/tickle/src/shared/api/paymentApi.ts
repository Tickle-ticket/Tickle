import { apiClient } from './client';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import {
  PaymentMethodSelectionRequest,
  PaymentMethodSelectionResponse,
  PaymentMethodSelectionResponseSchema,
  KakaoPayReadyRequest,
  KakaoPayReadyResponse,
  KakaoPayReadyResponseSchema,
  BankTransferPrepareRequest,
  BankTransferPrepareResponse,
  BankTransferPrepareResponseSchema,
  PaymentStatusResponse,
  PaymentStatusResponseSchema,
} from './types/payment.types';

export const paymentApi = {
  selectPaymentMethod: async (
    eventId: number | string,
    scheduleId: number | string,
    request: PaymentMethodSelectionRequest
  ): Promise<ApiResponse<PaymentMethodSelectionResponse>> => {
    return apiClient<ApiResponse<PaymentMethodSelectionResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/payments/select-method`,
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
    request: BankTransferPrepareRequest
  ): Promise<ApiResponse<BankTransferPrepareResponse>> => {
    return apiClient<ApiResponse<BankTransferPrepareResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/payments/bank-transfer`,
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
    request: KakaoPayReadyRequest
  ): Promise<ApiResponse<KakaoPayReadyResponse>> => {
    return apiClient<ApiResponse<KakaoPayReadyResponse>>(
      `/api/v1/events/${eventId}/schedules/${scheduleId}/payments/kakaopay/ready`,
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

  approveKakaoPay: async (paymentId: number | string, pgToken: string): Promise<void> => {
    return apiClient<void>(
      `/api/v1/payments/kakaopay/approve?paymentId=${paymentId}&pg_token=${pgToken}`,
      {
        method: 'GET',
      },
      false
    );
  },

  failKakaoPay: async (paymentId: number | string): Promise<void> => {
    return apiClient<void>(
      `/api/v1/payments/kakaopay/fail?paymentId=${paymentId}`,
      {
        method: 'GET',
      },
      false
    );
  },

  cancelKakaoPay: async (paymentId: number | string): Promise<void> => {
    return apiClient<void>(
      `/api/v1/payments/kakaopay/cancel?paymentId=${paymentId}`,
      {
        method: 'GET',
      },
      false
    );
  },
};
