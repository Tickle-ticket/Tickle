import { useDetailData, DetailData } from './useDetailData';
import { isShadowMode, getShadowDetailData } from '@/src/shared/utils/shadowMode';

/**
 * 공연 상세 데이터에 shadow 모드 대체 데이터를 얹는 래퍼 훅입니다.
 *
 * shadow 모드(eventId 404·405)는 봇 탐지 학습 데이터를 모으기 위한 가상 공연이라
 * 서버에 실제 레코드가 없다. 실제 조회 로직(useDetailData)은 서버 응답 변환만
 * 담당하도록 두고, 가상 공연 판별은 이 바깥 층에서만 한다.
 */
export const useDetailDataWithFixtures = (eventId: string | null | undefined) => {
  const shadowActive = isShadowMode(eventId);

  // shadow일 때는 존재하지 않는 eventId로 서버를 때리지 않도록 쿼리를 비활성화한다.
  const real = useDetailData(shadowActive ? null : eventId);

  if (shadowActive && eventId) {
    return {
      ...real,
      data: getShadowDetailData(eventId) as DetailData,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useDetailData>;
  }

  return real;
};
