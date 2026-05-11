import { useState, useEffect } from 'react';
import { seatApi } from '@/src/shared/api/seatApi';
import { getAccessToken } from '@/src/shared/api/tokenManager';

export interface SeatStatusData {
  priceGrade: string;
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
  admitToken: string | null = null,
  storyMode: boolean = false
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
    let initialSeatsFetched = false;
    let sseBuffer: any[] = [];

    // sessionSeatId를 기반으로 seatLabel(맵의 키)을 찾기 위한 룩업 맵
    const sessionSeatIdToLabelMap: Record<number, string> = {};

    const handleSeatUpdateEvent = (message: any, currentMap: SeatAvailabilityResponse | null) => {
      if (!currentMap) return currentMap;

      const newMap = { ...currentMap };
      let hasChanges = false;

      // 1. BOOKING 모드 (sessionSeatIds 배열)
      if (message.sessionSeatIds && Array.isArray(message.sessionSeatIds)) {
        message.sessionSeatIds.forEach((id: number) => {
          const label = sessionSeatIdToLabelMap[id];
          if (label && newMap[label]) {
            newMap[label] = {
              ...newMap[label],
              isAvailable: message.saleStatus === 'AVAILABLE'
            };
            hasChanges = true;
          }
        });
      }

      // 2. WAITLIST 모드 (sessionSeatId 단일 객체)
      if (message.sessionSeatId !== undefined) {
        const label = sessionSeatIdToLabelMap[message.sessionSeatId];
        if (label && newMap[label]) {
          newMap[label] = {
            ...newMap[label],
            isAvailable: message.saleStatus === 'AVAILABLE',
            waitingCount: message.waitingCount !== undefined ? message.waitingCount : newMap[label].waitingCount
          };
          hasChanges = true;
        }
      }

      return hasChanges ? newMap : currentMap;
    };

    const connectSSE = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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

      const processEvent = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);

          if (!initialSeatsFetched) {
            // 초기 조회가 아직 끝나지 않았다면 버퍼에 저장
            sseBuffer.push(message);
          } else {
            // 조회가 끝났다면 즉시 상태 업데이트 반영
            setSeatAvailability(prev => handleSeatUpdateEvent(message, prev));
          }
        } catch (e) {
          console.error('SSE message parse error', e);
        }
      };

      // WAITLIST 모드는 백엔드에서 기본 이벤트인 'message'로 전송함
      source.onmessage = processEvent;

      // BOOKING 모드는 백엔드에서 'seat-update'라는 명시적 이벤트 이름으로 전송함
      source.addEventListener('seat-update', processEvent as EventListener);

      source.onerror = (error) => {
        console.warn('Seat SSE connection error, browser will attempt to auto-reconnect...', error);
      };
    };

    const fetchInitialSeats = async () => {
      setIsLoading(true);
      try {
        let response;

        if (storyMode) {
          const mockMap: SeatAvailabilityResponse = {
            'A1': { priceGrade: 'VIP', isAvailable: mode !== 'WAITLIST', sessionSeatId: 1, detailedInfo: 'A구역 A열 1번', waitingCount: 12, waitable: true },
            'B2': { priceGrade: 'R', isAvailable: mode !== 'WAITLIST', sessionSeatId: 2, detailedInfo: 'B구역 B열 2번', waitingCount: 5, waitable: true },
            'D10': { priceGrade: 'S', isAvailable: true, sessionSeatId: 3, detailedInfo: 'C구역 D열 10번', waitingCount: 0, waitable: false },
            'E15': { priceGrade: 'S', isAvailable: false, sessionSeatId: 4, detailedInfo: 'D구역 E열 15번', waitingCount: 3, waitable: true },
            'J8': { priceGrade: 'A', isAvailable: mode !== 'WAITLIST', sessionSeatId: 5, detailedInfo: 'E구역 J열 8번', waitingCount: 20, waitable: true },
          };
          // 룩업 맵 채우기
          Object.entries(mockMap).forEach(([label, info]) => {
            if (info.sessionSeatId) sessionSeatIdToLabelMap[info.sessionSeatId] = label;
          });
          setVenueId(4001);
          setSeatAvailability(mockMap);
          initialSeatsFetched = true;
          setIsLoading(false);
          return;
        }

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
          let initialMap: SeatAvailabilityResponse = {};

          response.data.sections.forEach((section: any) => {
            section.seats.forEach((seat: any) => {
              const priceGrade = seat.priceGrade || '일반';
              const detailedInfo = `${section.sectionName} ${seat.rowLabel}열 ${seat.seatNumber}번`;
              const normalizedSeatLabel = seat.seatLabel.replace('-', '');

              // SSE 메시지 매핑을 위해 sessionSeatId -> seatLabel 관계 저장
              if (seat.sessionSeatId) {
                sessionSeatIdToLabelMap[seat.sessionSeatId] = normalizedSeatLabel;
              }

              initialMap[normalizedSeatLabel] = {
                priceGrade,
                isAvailable: seat.saleStatus === 'AVAILABLE',
                sessionSeatId: seat.sessionSeatId,
                detailedInfo,
                waitingCount: seat.waitingCount,
                waitable: seat.waitable,
              };
            });
          });

          initialSeatsFetched = true;

          // 초기 조회가 완료되었으므로, 그 사이에 버퍼에 쌓인 SSE 이벤트들을 일괄 적용
          if (sseBuffer.length > 0) {
            sseBuffer.forEach(message => {
              const updatedMap = handleSeatUpdateEvent(message, initialMap);
              if (updatedMap) {
                initialMap = updatedMap;
              }
            });
            sseBuffer = []; // 버퍼 비우기
          }

          setSeatAvailability(initialMap);
        }
      } catch (err) {
        console.error('Failed to fetch initial seats', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // 정석(Best Practice)대로 SSE를 먼저 구독한 뒤 전체 좌석을 조회합니다.
    connectSSE();
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
