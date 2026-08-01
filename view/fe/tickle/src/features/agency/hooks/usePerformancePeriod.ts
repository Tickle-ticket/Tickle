'use client';

import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import type {
  PerformanceScheduleMap,
  RegistrationErrorTarget,
} from '@/src/features/agency/model/registrationTypes';
import {
  buildDateKeysBetween,
  formatDateTimeLabel,
  parseDateKey,
  parseDateTimeLabel,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 공연 기간(오픈일·종료일) 입력을 다룹니다.
 *
 * <p>기간이 바뀌면 그 밖으로 벗어난 회차를 정리해야 합니다. 예를 들어 종료일을
 * 앞당기면 뒤쪽 회차가 공연 기간 밖에 남는데, 그대로 두면 등록 시점에야
 * 걸립니다. 여기서 즉시 맞춥니다.</p>
 *
 * <p>입력란은 직접 타이핑도 받습니다. 그래서 문자열과 Date를 함께 들고 있고,
 * 파싱에 실패하면 Date만 비우고 사용자가 적던 문자열은 남깁니다.</p>
 */
export const usePerformancePeriod = ({
  setPerformanceSchedules,
  selectedScheduleDateKeys,
  setSelectedScheduleDateKeys,
  selectedScheduleDateKey,
  setSelectedScheduleDate,
  clearRegistrationFieldError,
  performanceOpenAt,
  setPerformanceOpenAt,
  performanceCloseAt,
  setPerformanceCloseAt,
}: {
  performanceSchedules: PerformanceScheduleMap;
  setPerformanceSchedules: Dispatch<SetStateAction<PerformanceScheduleMap>>;
  selectedScheduleDateKeys: string[];
  setSelectedScheduleDateKeys: Dispatch<SetStateAction<string[]>>;
  selectedScheduleDateKey: string | null;
  setSelectedScheduleDate: Dispatch<SetStateAction<Date | null>>;
  clearRegistrationFieldError: (target: RegistrationErrorTarget) => void;
  performanceOpenAt: Date | null;
  setPerformanceOpenAt: Dispatch<SetStateAction<Date | null>>;
  performanceCloseAt: Date | null;
  setPerformanceCloseAt: Dispatch<SetStateAction<Date | null>>;
}) => {
  const [performanceOpenInputValue, setPerformanceOpenInputValue] = useState('');
  const [performanceCloseInputValue, setPerformanceCloseInputValue] = useState('');
  const [performanceOpenPlaceholder] = useState(() => formatDateTimeLabel(new Date()));
  const [performanceClosePlaceholder] = useState(() => formatDateTimeLabel(new Date()));

const syncSchedulesToPerformanceRange = (nextOpenAt: Date, nextCloseAt: Date) => {
  const nextDateKeys = buildDateKeysBetween(nextOpenAt, nextCloseAt);
  const nextSelectedDateKeys = selectedScheduleDateKeys.filter((dateKey) => nextDateKeys.includes(dateKey));
  const nextActiveDateKey =
    selectedScheduleDateKey && nextSelectedDateKeys.includes(selectedScheduleDateKey)
      ? selectedScheduleDateKey
      : nextSelectedDateKeys[0] ?? null;

  setSelectedScheduleDateKeys(nextSelectedDateKeys);
  setSelectedScheduleDate(nextActiveDateKey ? parseDateKey(nextActiveDateKey) : null);

  setPerformanceSchedules((current) => {
    const availableDateKeys = new Set(nextDateKeys);
    return Object.fromEntries(
      Object.entries(current)
        .filter(([dateKey]) => availableDateKeys.has(dateKey))
        .map(([dateKey, times]) => [dateKey, [...new Set(times)].sort()]),
    );
  });
};

const handlePerformanceOpenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
  const nextValue = event.target.value;
  const parsed = parseDateTimeLabel(nextValue);

  setPerformanceOpenInputValue(nextValue);
  clearRegistrationFieldError('performanceDate');

  if (nextValue.trim().length === 0) {
    setPerformanceOpenAt(null);
    setSelectedScheduleDate(null);
    setSelectedScheduleDateKeys([]);
    setPerformanceSchedules({});
    return;
  }

  if (!parsed) {
    return;
  }

  setPerformanceOpenAt(parsed);
  const nextPerformanceCloseAt =
    performanceCloseAt && performanceCloseAt.getTime() >= parsed.getTime()
      ? performanceCloseAt
      : null;

  if (performanceCloseAt && performanceCloseAt.getTime() < parsed.getTime()) {
    setPerformanceCloseAt(null);
    setPerformanceCloseInputValue('');
  }

  if (nextPerformanceCloseAt) {
    syncSchedulesToPerformanceRange(parsed, nextPerformanceCloseAt);
  }
};

const handlePerformanceCloseInputChange = (event: ChangeEvent<HTMLInputElement>) => {
  const nextValue = event.target.value;
  const parsed = parseDateTimeLabel(nextValue);

  setPerformanceCloseInputValue(nextValue);
  clearRegistrationFieldError('performanceDate');

  if (nextValue.trim().length === 0) {
    setPerformanceCloseAt(null);
    setSelectedScheduleDate(null);
    setSelectedScheduleDateKeys([]);
    setPerformanceSchedules({});
    return;
  }

  if (!parsed || (performanceOpenAt && parsed.getTime() < performanceOpenAt.getTime())) {
    return;
  }

  setPerformanceCloseAt(parsed);
  if (performanceOpenAt) {
    syncSchedulesToPerformanceRange(performanceOpenAt, parsed);
  }
};

  return {
    performanceOpenInputValue,
    setPerformanceOpenInputValue,
    performanceCloseInputValue,
    setPerformanceCloseInputValue,
    performanceOpenPlaceholder,
    performanceClosePlaceholder,
    syncSchedulesToPerformanceRange,
    handlePerformanceOpenInputChange,
    handlePerformanceCloseInputChange,
  };
};
