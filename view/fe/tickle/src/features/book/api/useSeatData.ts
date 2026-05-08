import { useState, useEffect } from 'react';
import { seatApi } from '@/src/shared/api/seatApi';
import { getAccessToken } from '@/src/shared/api/tokenManager';

export interface SeatStatusData {
  grade: string;
  isAvailable: boolean;
  sessionSeatId?: number; // Backend sessionSeatId
  detailedInfo?: string;
  waitingCount?: number;
  waitable?: boolean;
}

export type SeatAvailabilityResponse = Record<string, SeatStatusData>;

export const useSeatData = (
  eventId: string | null,
  scheduleId: string | null,
  enableWs: boolean = true,
  mode: 'BOOKING' | 'WAITLIST' = 'BOOKING',
  admitToken: string | null = null
) => {
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [venueId, setVenueId] = useState<number | null>(null);

  useEffect(() => {
    if (!eventId || !scheduleId) {
      setSeatAvailability(null);
      setIsLoading(false);
      return;
    }

    if (!enableWs) {
      setSeatAvailability({});
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let source: EventSource | null = null;

    const fetchInitialSeats = async () => {
      setIsLoading(true);
      try {
        let response;

        if (mode === 'WAITLIST') {
          if (!admitToken) {
            throw new Error('예매 대기 모드에서는 admitToken이 필요합니다.');
          }
          response = await seatApi.fetchCancellationWaitSeats(eventId, scheduleId, admitToken);
        } else {
          response = await seatApi.fetchSeats(eventId, scheduleId);
        }

        if (response.data && response.data.sections && isMounted) {
          if (response.data.venueId) {
            setVenueId(response.data.venueId);
          }
          const initialMap: SeatAvailabilityResponse = {};

          response.data.sections.forEach(section => {
            section.seats.forEach(seat => {
              // Map seatLabel (e.g. A1, B2) to the SVG ID
              // 백엔드에서 전달받은 좌석 등급(grade)을 직접 사용합니다.
              const grade = seat.grade;

              // 백엔드에서 전달받은 구역, 열, 번호를 조합하여 상세 정보 생성
              // 예: "1층 A구역 A열 1번" (sectionName이 "1층 A구역"인 경우)
              const detailedInfo = `${section.sectionName} ${seat.rowLabel}열 ${seat.seatNumber}번`;

              const normalizedSeatLabel = seat.seatLabel.replace('-', '');

              initialMap[normalizedSeatLabel] = {
                grade,
                isAvailable: seat.saleStatus === 'AVAILABLE',
                sessionSeatId: seat.sessionSeatId,
                detailedInfo,
                waitingCount: seat.waitingCount,
                waitable: seat.waitable,
              };
            });
          });

          setSeatAvailability(initialMap);
          connectSSE();
        }
      } catch (err) {
        console.error('Failed to fetch initial seats', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const connectSSE = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      let streamUrl = '';

      if (mode === 'WAITLIST') {
        if (!admitToken) {
          console.error('SSE 연결 실패: admitToken이 없습니다.');
          return;
        }
        streamUrl = `${apiUrl}/api/v1/events/${eventId}/schedules/${scheduleId}/cancellation-wait/seats/stream?admitToken=${admitToken}`;
      } else {
        streamUrl = `${apiUrl}/api/v1/events/${eventId}/schedules/${scheduleId}/seats/stream`;
      }

      const token = getAccessToken();
      let finalUrl = streamUrl;
      if (token) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}token=${token}`;
      }

      source = new EventSource(finalUrl);

      source.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message && message.seatLabel) {
            const normalizedLabel = message.seatLabel.replace('-', '');
            setSeatAvailability(prev => {
              if (!prev) return prev;
              const prevSeat = prev[normalizedLabel];
              if (!prevSeat) return prev;

              return {
                ...prev,
                [normalizedLabel]: {
                  ...prevSeat,
                  isAvailable: message.saleStatus === 'AVAILABLE',
                  waitingCount: message.waitingCount !== undefined ? message.waitingCount : prevSeat.waitingCount,
                  waitable: message.waitable !== undefined ? message.waitable : prevSeat.waitable,
                }
              };
            });
          }
        } catch (e) {
          console.error('SSE message parse error', e);
        }
      };

      source.onerror = (error) => {
        console.warn('Seat SSE connection error, browser will attempt to auto-reconnect...', error);
      };
    };

    fetchInitialSeats();

    return () => {
      isMounted = false;
      if (source) {
        source.close();
      }
    };
  }, [eventId, scheduleId, enableWs]);

  return { data: seatAvailability, venueId, isLoading, error };
};
