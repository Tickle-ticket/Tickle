import { useState, useEffect } from 'react';
import { useSeatData, SeatAvailabilityResponse } from './useSeatData';
import { isShadowMode, generateShadowMockSeats } from '@/src/shared/utils/shadowMode';
import { FIXTURE_VENUE_ID } from './seatFixtures';

/**
 * 좌석 데이터에 shadow 모드 대체 데이터를 얹는 래퍼 훅입니다.
 *
 * shadow 모드(eventId 404·405)는 봇 탐지 학습 데이터를 모으기 위한 가상 공연이라
 * 서버에 좌석 레코드가 없다. 실제 조회 로직(useSeatData)은 SSE 구독·초기 조회·
 * 버퍼 병합만 담당하도록 두고, 가상 좌석 생성은 이 바깥 층에서만 한다.
 *
 * Storybook은 여기를 타지 않는다 — MSW 핸들러가 좌석 응답을 내주므로 실제
 * 조회 코드를 그대로 태운다.
 */
export const useSeatDataWithFixtures = (
  eventId: string | null,
  scheduleId: string | null,
  enableWs: boolean = true,
  mode: 'BOOKING' | 'WAITLIST' = 'BOOKING',
  admitToken: string | null = null,
) => {
  const shadowActive = isShadowMode(eventId);

  // shadow일 때는 존재하지 않는 좌석을 조회하지 않도록 실제 훅을 꺼둔다.
  const real = useSeatData(
    eventId,
    scheduleId,
    shadowActive ? false : enableWs,
    mode,
    admitToken,
  );

  const [shadowSeats, setShadowSeats] = useState<SeatAvailabilityResponse | null>(null);

  useEffect(() => {
    if (!shadowActive || !eventId || !scheduleId) {
      setShadowSeats(null);
      return;
    }

    setShadowSeats(generateShadowMockSeats());

    // 실제 SSE 대신 주기적으로 좌석 상태를 갱신해 실시간 변동을 흉내낸다.
    const interval = setInterval(() => {
      setShadowSeats(generateShadowMockSeats());
    }, 2500);

    return () => clearInterval(interval);
  }, [shadowActive, eventId, scheduleId]);

  if (shadowActive) {
    return {
      data: shadowSeats,
      venueId: FIXTURE_VENUE_ID,
      isLoading: shadowSeats === null,
      error: null,
      // shadow는 SSE를 쓰지 않고 setInterval로 좌석을 갱신하므로 끊길 일이 없다.
      isStreamDisconnected: false,
    };
  }

  return real;
};
