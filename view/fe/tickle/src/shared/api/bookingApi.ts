import { apiClient } from './client';
import { ApiResponse } from './types';
import { Schema } from 'effect';
import { createApiResponseSchema } from '../utils/schema';

export interface BookingPreorderTicket {
  sessionSeatId: number;
  ticketPriceAmount: number;
}

export interface BookingPreorderRequest {
  eventId: number;
  scheduleId: number;
  tickets: BookingPreorderTicket[];
}

export interface BookingPreorderResponse {
  bookingId: number;
  bookingNo: string;
}

export const BookingPreorderResponseSchema = Schema.Struct({
  bookingId: Schema.Number,
  bookingNo: Schema.String,
});

export const bookingApi = {
  preorder: async (
    request: BookingPreorderRequest
  ): Promise<ApiResponse<BookingPreorderResponse>> => {
    return apiClient<ApiResponse<BookingPreorderResponse>>(
      `/api/v1/bookings/preorder`,
      {
        method: 'POST',
        data: request,
      },
      true,
      createApiResponseSchema(BookingPreorderResponseSchema)
    );
  },
};
