import { useState, useEffect } from 'react';
import { seatApi } from '@/src/shared/api/seatApi';
import { getAccessToken } from '@/src/shared/api/tokenManager';
import {
  getReconnectDelay,
  shouldRetry,
  SEAT_MAX_RECONNECT_ATTEMPTS,
} from '@/src/shared/lib/sseReconnect';

export interface SeatStatusData {
  priceGrade: string;
  isAvailable: boolean;
  sessionSeatId?: number; // Backend sessionSeatId
  detailedInfo?: string;
  waitingCount?: number;
  waitable?: boolean;
}

export type SeatAvailabilityResponse = Record<string, SeatStatusData>;

/**
 * 좌석 상태 변경 SSE 메시지.
 *
 * 예매(BOOKING)는 여러 좌석이 한꺼번에 바뀌므로 배열로, 취소표 대기(WAITLIST)는
 * 좌석 하나씩 대기 인원과 함께 온다. 두 모드가 같은 스트림을 쓰지 않아 필드가
 * 서로 배타적이라, 호출부는 어느 쪽이 있는지 보고 분기한다.
 */
export interface SeatUpdateMessage {
  /** BOOKING 모드. 한 번에 바뀐 좌석들 */
  sessionSeatIds?: number[];
  /** WAITLIST 모드. 바뀐 좌석 하나 */
  sessionSeatId?: number;
  saleStatus?: string;
  /** WAITLIST 모드에서만 온다 */
  waitingCount?: number;
}

export const useSeatData = (
  eventId: string | null,
  scheduleId: string | null,
  enableWs: boolean = true,
  mode: 'BOOKING' | 'WAITLIST' = 'BOOKING',
  admitToken: string | null = null
) => {
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [venueId, setVenueId] = useState<number | null>(null);
  /**
   * 좌석 실시간 동기화가 끊긴 채 복구되지 않은 상태.
   *
   * 화면에 보이는 좌석 상태가 더 이상 갱신되지 않는다는 뜻이라, 호출부가
   * 사용자에게 새로고침을 안내할 근거로 쓴다.
   */
  const [isStreamDisconnected, setIsStreamDisconnected] = useState(false);

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
    let sseBuffer: SeatUpdateMessage[] = [];
    /** 좌석 스트림 연속 실패 횟수. 연결에 성공하면 0으로 되돌린다. */
    let reconnectAttempt = 0;
    let reconnectTimer: NodeJS.Timeout | null = null;

    // sessionSeatId를 기반으로 seatLabel(맵의 키)을 찾기 위한 룩업 맵
    const sessionSeatIdToLabelMap: Record<number, string> = {};

    const handleSeatUpdateEvent = (
      message: SeatUpdateMessage,
      currentMap: SeatAvailabilityResponse | null,
    ) => {
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

      source.onopen = () => {
        // 붙었으면 이전 실패는 흘려보낸다. 좌석 선택은 오래 머무는 화면이라
        // 누적해두면 띄엄띄엄 끊긴 것만으로 재연결을 포기하게 된다.
        reconnectAttempt = 0;
        setIsStreamDisconnected(false);
      };

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

      source.onerror = () => {
        // EventSource는 스스로도 재연결하지만, 몇 번을 시도했는지·결국 실패했는지를
        // 알려주지 않는다. 그대로 두면 좌석 동기화가 끊긴 채 화면만 멀쩡해 보여서
        // 남이 이미 잡은 자리를 계속 고르게 된다. 직접 관리해 상태를 노출한다.
        source?.close();
        source = null;

        if (!isMounted) return;

        if (!shouldRetry(reconnectAttempt, SEAT_MAX_RECONNECT_ATTEMPTS)) {
          console.error(`[Seat SSE] 재연결 포기 (${reconnectAttempt}회 실패)`);
          setIsStreamDisconnected(true);
          return;
        }

        const delay = getReconnectDelay(reconnectAttempt);
        reconnectAttempt += 1;
        console.warn(
          `[Seat SSE] 연결 끊김. ${delay}ms 후 재연결 (${reconnectAttempt}/${SEAT_MAX_RECONNECT_ATTEMPTS})`,
        );
        reconnectTimer = setTimeout(connectSSE, delay);
      };
    };

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
          let initialMap: SeatAvailabilityResponse = {};

          response.data.sections.forEach((section) => {
            section.seats.forEach((seat) => {
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
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [eventId, scheduleId, enableWs]);

  return { data: seatAvailability, venueId, isLoading, error, isStreamDisconnected };
};
