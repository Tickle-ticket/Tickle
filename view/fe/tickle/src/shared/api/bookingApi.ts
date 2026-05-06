import { apiClient } from './client';
import { ApiResponse } from './types';
import { createApiResponseSchema } from '../utils/schema';
import {
  BookingPreorderRequest,
  BookingPreorderResponse,
  BookingPreorderResponseSchema,
  BookingOptionsRequest,
  BookingOptionsResponse,
  BookingOptionsResponseSchema
} from './types/booking.types';

export const bookingApi = {
  getBookingOptions: async (
    request: BookingOptionsRequest
  ): Promise<ApiResponse<BookingOptionsResponse>> => {
    return apiClient<ApiResponse<BookingOptionsResponse>>(
      `/api/v1/bookings/options`,
      {
        method: 'POST',
        body: request,
      },
      true,
      createApiResponseSchema(BookingOptionsResponseSchema)
    );
  },

  preorder: async (
    request: BookingPreorderRequest
  ): Promise<ApiResponse<BookingPreorderResponse>> => {
    return apiClient<ApiResponse<BookingPreorderResponse>>(
      `/api/v1/bookings/preorder`,
      {
        method: 'POST',
        body: request,
      },
      true,
      createApiResponseSchema(BookingPreorderResponseSchema)
    );
  },
};
