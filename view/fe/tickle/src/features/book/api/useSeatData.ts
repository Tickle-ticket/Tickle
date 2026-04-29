import { useState, useEffect } from 'react';
import { seatApi } from '@/src/shared/api/seatApi';

export interface SeatStatusData {
  grade: string;
  isAvailable: boolean;
  sessionSeatId?: number; // Backend sessionSeatId
}

export type SeatAvailabilityResponse = Record<string, SeatStatusData>;

export const useSeatData = (eventId: string | null, scheduleId: string | null, enableWs: boolean = true) => {
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    let socket: WebSocket | null = null;

    const fetchInitialSeats = async () => {
      setIsLoading(true);
      try {
        const response = await seatApi.fetchSeats(eventId, scheduleId);
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

              initialMap[seat.seatLabel] = {
                grade,
                isAvailable: seat.saleStatus === 'AVAILABLE',
                sessionSeatId: seat.sessionSeatId,
              };
            });
          });

          setSeatAvailability(initialMap);
          connectWebSocket();
        }
      } catch (err) {
        console.error('Failed to fetch initial seats', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const connectWebSocket = () => {
      // Backend STOMP or raw WebSocket. Assuming raw WS for now based on docs: /topic/seats/{scheduleId}
      // If the backend uses STOMP, a STOMP client would be needed, but we'll stick to native WS for now as in the original code, just updating URL.
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.tickle.com';
      socket = new WebSocket(`${wsUrl}/topic/seats/${scheduleId}`);

      socket.onmessage = (event) => {
        // Parse incoming update. Assuming backend sends: { seatLabel: string, saleStatus: string } or similar
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
                  isAvailable: message.saleStatus === 'AVAILABLE'
                }
              };
            });
          }
        } catch (e) {
          console.error('WS message parse error', e);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };
    };

    fetchInitialSeats();

    return () => {
      isMounted = false;
      if (socket) socket.close();
    };
  }, [eventId, scheduleId, enableWs]);

  return { data: seatAvailability, isLoading };
};
