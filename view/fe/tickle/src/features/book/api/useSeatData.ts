import { useState, useEffect } from 'react';

// 좌석 예약 가능 여부 (ID별 true/false 매핑)
export interface SeatStatusData {
  grade: string;
  isAvailable: boolean;
}

export type SeatAvailabilityResponse = Record<string, SeatStatusData>;

export const useSeatData = (scheduleId: string | null, enableWs: boolean = true) => {
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!scheduleId) {
      setSeatAvailability(null);
      setIsLoading(false);
      return;
    }

    if (!enableWs) {
      // WS 연결을 하지 않을 경우 빈 상태로 시작. 
      // (BookView 쪽에서 initialSeats 에 따라 UI상 직접 제어)
      setSeatAvailability({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // MSW WebSocket Endpoint 연결
    const socket = new WebSocket(`wss://api.tickle.com/ws/seats`);

    socket.onopen = () => {
      console.log(`Connected to Seat WebSocket. Subscribing to schedule ${scheduleId}`);
      // 연결 후 즉시 해당 회차(scheduleId)를 구독하겠다는 메시지를 서버에 보냄
      socket.send(JSON.stringify({ type: 'SUBSCRIBE', scheduleId }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'INIT') {
        // 초기 전체 좌석 상태 설정
        setSeatAvailability(message.seats);
        setIsLoading(false);
      } else if (message.type === 'UPDATE') {
        // 실시간 특정 좌석 상태 업데이트
        setSeatAvailability(prev => {
          if (!prev) return prev;
          const prevSeat = prev[message.seatId];
          if (!prevSeat) return prev;

          return {
            ...prev,
            [message.seatId]: {
              ...prevSeat,
              isAvailable: message.isAvailable
            }
          };
        });
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setIsLoading(false);
    };

    return () => {
      socket.close();
    };
  }, [scheduleId, enableWs]);

  return { data: seatAvailability, isLoading };
};
