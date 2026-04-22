import { useState, useEffect } from 'react';

/**
 * 값이 변경된 후 일정 시간(delay)이 지나야만 최종 값을 업데이트하는 훅입니다.
 * 주로 검색창 등에서 연속된 타자로 인한 API 중복 호출(따닥)을 방지할 때 사용합니다.
 * 
 * @param value 지연시킬 원래 값
 * @param delay 지연 시간 (기본값: 300ms)
 * @returns 지연이 적용된 최종 값
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // delay 시간 후에 값을 업데이트하는 타이머 설정
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 다음 값이 들어오면 기존 타이머를 취소 (연속 입력 시 초기화)
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
