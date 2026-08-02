'use client';

import { useEffect, useState } from 'react';

/** 좌석을 잡아 둘 수 있는 시간. */
const BOOKING_HOLD_SECONDS = 600;

/** mm:ss로 표시한다. */
export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * 결제 제한 시간을 재고, 0이 되면 알립니다.
 *
 * <p>좌석을 잡아 둔 채로 시간이 지나면 다른 사람이 살 수 없습니다. 그래서 10분이
 * 지나면 선점을 풀고 예매를 닫아야 합니다. 실제로 무엇을 풀지는 단계에 따라
 * 다르므로(초안이 있으면 초안 취소, 없으면 좌석 해제) 호출부가 정합니다.</p>
 *
 * @param isActive 시간을 재야 하는 상황인지. 좌석 선택 중이거나 변경 모드면 끈다
 * @param onExpire 시간이 다 됐을 때
 * @return timeLeft 남은 초 · formattedTimeLeft mm:ss
 */
export const useBookingTimer = ({
  isActive,
  onExpire,
}: {
  isActive: boolean;
  onExpire: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState(BOOKING_HOLD_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      onExpire();
    }
    // onExpire는 매 렌더 새로 만들어지므로 의존성에 넣으면 만료 처리가 반복된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isActive]);

  return { timeLeft, formattedTimeLeft: formatTime(timeLeft) };
};
