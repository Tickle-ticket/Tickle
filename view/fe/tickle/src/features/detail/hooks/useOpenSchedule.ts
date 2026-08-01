'use client';

import { useNow } from '@/src/shared/hooks/useNow';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 예매·취소표 대기가 아직 열리지 않았는지 판정합니다.
 *
 * <p>예전에는 상태 네 개를 두고 setInterval과 setTimeout 두 개로 갱신했습니다.
 * 오픈 시각에 정확히 맞춰 켜려고 타이머를 따로 걸었던 것인데, 남은 시간은
 * 오픈 시각과 현재 시각만으로 정해지므로 상태에 담아 둘 이유가 없습니다.</p>
 *
 * <p>1초마다 갱신되는 공용 시계(useNow)에서 바로 계산합니다. 타이머가 하나로
 * 줄고, 경계를 넘는 순간 리렌더가 일어나 버튼이 스스로 열립니다.</p>
 *
 * @param openDate         예매 오픈 시각
 * @param waitlistOpenDate 취소표 대기 오픈 시각. 없을 수 있다
 * @return 각 버튼의 오픈 전 여부와, 하루 넘게 남았는지
 */
export const useOpenSchedule = (
  openDate: string | null | undefined,
  waitlistOpenDate: string | null | undefined,
) => {
  const now = useNow();

  // 서버 렌더 중에는 now가 0이라 시각을 판정할 수 없다. 기존 구현도 상태
  // 초기값이 false(오픈됨)였고 effect가 돈 뒤에 확정됐으므로 그대로 맞춘다.
  if (now === 0 || !openDate) {
    return {
      isUpcoming: false,
      isMoreThanOneDayLeft: false,
      isWaitlistUpcoming: false,
      isWaitlistMoreThanOneDayLeft: false,
    };
  }

  const openTime = new Date(openDate).getTime();
  const waitlistOpenTime = waitlistOpenDate ? new Date(waitlistOpenDate).getTime() : 0;

  return {
    isUpcoming: openTime > now,
    isMoreThanOneDayLeft: openTime - now > ONE_DAY_MS,
    isWaitlistUpcoming: waitlistOpenTime > 0 && waitlistOpenTime > now,
    isWaitlistMoreThanOneDayLeft:
      waitlistOpenTime > 0 && waitlistOpenTime - now > ONE_DAY_MS,
  };
};
