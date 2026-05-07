import { useState, useEffect } from 'react';
import { seatApi } from '@/src/shared/api/seatApi';

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
    let eventSource: EventSource | null = null;

    const fetchInitialSeats = async () => {
      setIsLoading(true);
      try {
        const userId = localStorage.getItem('userId') || '1'; // or using getUserId()
        let response;

        if (mode === 'WAITLIST') {
          if (!admitToken) {
            throw new Error('예매 대기 모드에서는 admitToken이 필요합니다.');
          }
          response = await seatApi.fetchCancellationWaitSeats(eventId, scheduleId, userId, admitToken);
        } else {
          response = await seatApi.fetchSeats(eventId, scheduleId);
        }

        if (response.data && response.data.sections && isMounted) {
          const initialMap: SeatAvailabilityResponse = {};

          response.data.sections.forEach(section => {
            section.seats.forEach(seat => {
              // Map seatLabel (e.g. A1, B2) to the SVG ID
              // and determine grade based on sectionName or rowLabel if needed.
              // We will just extract grade roughly, or default to general if no info.
              let grade = '일반';
              const gradeMatch = section.sectionName.match(/([A-Z]+|VIP|R|S|A)석/i);
              if (gradeMatch) {
                grade = gradeMatch[1].toUpperCase();
              } else {
                const match = seat.seatLabel.match(/^[a-zA-Z]+/);
                if (match) {
                  grade = match[0].toUpperCase();
                  if (grade === 'V') grade = 'VIP';
                }
              }

              // 백엔드에서 전달받은 구역, 열, 번호를 조합하여 상세 정보 생성
              // 예: "1층 A구역 A열 1번" (sectionName이 "1층 A구역"인 경우)
              const detailedInfo = `${section.sectionName} ${seat.rowLabel}열 ${seat.seatNumber}번`;

              initialMap[seat.seatLabel] = {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const userId = localStorage.getItem('userId') || '1';
      let streamUrl = '';

      if (mode === 'WAITLIST') {
        if (!admitToken) {
          console.error('SSE 연결 실패: admitToken이 없습니다.');
          return;
        }
        streamUrl = `${apiUrl}/api/v1/events/${eventId}/schedules/${scheduleId}/cancellation-wait/seats/stream?userId=${userId}&admitToken=${admitToken}`;
      } else {
        streamUrl = `${apiUrl}/api/v1/events/${eventId}/schedules/${scheduleId}/seats/stream`;
      }

      // EventSource를 사용하여 SSE 스트림 연결
      eventSource = new EventSource(streamUrl, { withCredentials: true });

      // 커스텀 이벤트 타입이 있다면 eventSource.addEventListener('이름', ...) 으로 변경 가능
      // 여기서는 기본 onmessage 사용 (백엔드에서 데이터 전송 시 'message' 이벤트라고 가정)
      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message && message.seatLabel) {
            setSeatAvailability(prev => {
              if (!prev) return prev;
              const prevSeat = prev[message.seatLabel];
              if (!prevSeat) return prev;

              return {
                ...prev,
                [message.seatLabel]: {
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

      eventSource.onerror = (error) => {
        console.error('Seat SSE Error (Expected WS instead):', error);
      };
    };

    fetchInitialSeats();

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
    };
  }, [eventId, scheduleId, enableWs]);

  return { data: seatAvailability, isLoading, error };
};
