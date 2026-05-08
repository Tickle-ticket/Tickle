import { useState } from 'react';
import { bookingApi } from '@/src/shared/api/bookingApi';
import { BookingOptionsResponse } from '@/src/shared/api/types/booking.types';

export const useBookingPreorder = () => {
  const [optionsData, setOptionsData] = useState<BookingOptionsResponse | null>(null);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [isPreorderLoading, setIsPreorderLoading] = useState(false);
  const [preorderBookingId, setPreorderBookingId] = useState<number | null>(null);

  const fetchOptions = async (
    eventId: number,
    sessionId: number,
    seatIds: number[]
  ) => {
    setIsOptionsLoading(true);
    try {
      const response = await bookingApi.getBookingOptions({
        eventId,
        sessionId,
        seatIds,
      });
      if (response.data) {
        setOptionsData(response.data);
      }
      return response.data;
    } catch (err: any) {
      console.error('Failed to fetch booking options:', err);
      throw err;
    } finally {
      setIsOptionsLoading(false);
    }
  };

  const submitPreorder = async (
    eventId: number,
    sessionId: number,
    seatIds: number[],
    optionSelections: { sessionSeatId: number; discountName: string | null }[]
  ) => {
    setIsPreorderLoading(true);
    try {
      const response = await bookingApi.preorder({
        eventId,
        sessionId,
        sessionSeatIds: seatIds,
        optionSelections,
      });
      if (response.data?.bookingId) {
        setPreorderBookingId(response.data.bookingId);
      }
      return response.data;
    } catch (err: any) {
      console.error('Preorder failed:', err);
      throw err;
    } finally {
      setIsPreorderLoading(false);
    }
  };

  return {
    optionsData,
    isOptionsLoading,
    fetchOptions,
    submitPreorder,
    isPreorderLoading,
    preorderBookingId,
  };
};
