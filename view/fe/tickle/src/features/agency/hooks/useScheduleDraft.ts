'use client';

import { useMemo, useState } from 'react';
import type {
  PerformanceScheduleMap,
  RegistrationErrorTarget,
  ScheduleTimePeriod,
} from '@/src/features/agency/model/registrationTypes';
import {
  buildDateKeysBetween,
  formatDateKey,
  formatScheduleDateShortLabel,
  getScheduleTimePeriod,
  isValidScheduleTime,
  parseDateKey,
  scheduleTimeQuickOptionsByPeriod,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 공연 회차(날짜 + 시각) 편집 상태를 다룹니다.
 *
 * <p>등록 페이지가 상태 45개를 한 곳에 들고 있어, 어떤 값이 어떤 화면에 쓰이는지
 * 구분되지 않았습니다. 회차 편집은 그중 가장 큰 덩어리이면서 다른 도메인과
 * 얽히는 부분이 유효성 표시 하나뿐이라 먼저 떼어냈습니다.</p>
 *
 * @param performanceOpenAt  공연 시작일. 선택 가능한 날짜 범위를 정한다
 * @param performanceCloseAt 공연 종료일
 * @param clearFieldError    회차를 건드리면 해당 필드의 오류 표시를 지운다
 */
export const useScheduleDraft = ({
  performanceOpenAt,
  performanceCloseAt,
  clearFieldError,
}: {
  performanceOpenAt: Date | null;
  performanceCloseAt: Date | null;
  clearFieldError: (target: RegistrationErrorTarget) => void;
}) => {
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
  const [selectedScheduleDateKeys, setSelectedScheduleDateKeys] = useState<string[]>([]);
  const [performanceSchedules, setPerformanceSchedules] = useState<PerformanceScheduleMap>({});
  const [scheduleTimeInputValue, setScheduleTimeInputValue] = useState('');
  const [scheduleTimePeriod, setScheduleTimePeriod] = useState<ScheduleTimePeriod>('pm');

  const performanceScheduleDateKeys = useMemo(
    () =>
      performanceOpenAt && performanceCloseAt
        ? buildDateKeysBetween(performanceOpenAt, performanceCloseAt)
        : [],
    [performanceOpenAt, performanceCloseAt],
  );

  const selectedScheduleDateKey = selectedScheduleDate ? formatDateKey(selectedScheduleDate) : null;

  const selectedScheduleDateLabels = useMemo(
    () =>
      selectedScheduleDateKeys
        .map((dateKey) => parseDateKey(dateKey))
        .filter((value): value is Date => value !== null)
        .map((value) => formatScheduleDateShortLabel(value)),
    [selectedScheduleDateKeys],
  );

  const selectedScheduleTimes = useMemo(() => {
    if (!selectedScheduleDateKey) {
      return [];
    }

    return performanceSchedules[selectedScheduleDateKey] ?? [];
  }, [performanceSchedules, selectedScheduleDateKey]);

  const visibleScheduleTimeQuickOptions = scheduleTimeQuickOptionsByPeriod[scheduleTimePeriod];

  const handleScheduleDateToggle = (dateKey: string) => {
    const scheduleDate = parseDateKey(dateKey);

    if (!scheduleDate) {
      return;
    }

    const isSelected = selectedScheduleDateKeys.includes(dateKey);

    const nextSelectedDateKeys = isSelected
      ? selectedScheduleDateKeys.filter((entryDateKey) => entryDateKey !== dateKey)
      : [...selectedScheduleDateKeys, dateKey].sort();

    clearFieldError('schedule');
    setSelectedScheduleDateKeys(nextSelectedDateKeys);

    if (!isSelected) {
      setSelectedScheduleDate(scheduleDate);
      return;
    }

    if (selectedScheduleDateKey === dateKey) {
      const fallbackDateKey = nextSelectedDateKeys[0] ?? null;
      setSelectedScheduleDate(fallbackDateKey ? parseDateKey(fallbackDateKey) : null);
    }
  };

  const handleScheduleWeekdayToggle = (weekday: number) => {
    const targetDateKeys = performanceScheduleDateKeys.filter((dateKey) => {
      const scheduleDate = parseDateKey(dateKey);
      return scheduleDate?.getDay() === weekday;
    });

    if (targetDateKeys.length === 0) {
      return;
    }

    const selectedDateKeySet = new Set(selectedScheduleDateKeys);
    const isEveryTargetSelected = targetDateKeys.every((dateKey) => selectedDateKeySet.has(dateKey));

    if (isEveryTargetSelected) {
      targetDateKeys.forEach((dateKey) => selectedDateKeySet.delete(dateKey));
    } else {
      targetDateKeys.forEach((dateKey) => selectedDateKeySet.add(dateKey));
    }

    const nextSelectedDateKeys = Array.from(selectedDateKeySet).sort();
    clearFieldError('schedule');
    setSelectedScheduleDateKeys(nextSelectedDateKeys);

    if (!isEveryTargetSelected) {
      setSelectedScheduleDate(parseDateKey(targetDateKeys[0]));
      return;
    }

    if (selectedScheduleDateKey && !nextSelectedDateKeys.includes(selectedScheduleDateKey)) {
      const fallbackDateKey = nextSelectedDateKeys[0] ?? null;
      setSelectedScheduleDate(fallbackDateKey ? parseDateKey(fallbackDateKey) : null);
    }
  };

  const handleScheduleTimeAdd = (timeValue = scheduleTimeInputValue) => {
    if (!isValidScheduleTime(timeValue)) {
      return;
    }

    const targetDateKeys = selectedScheduleDateKeys.length > 0
      ? selectedScheduleDateKeys
      : selectedScheduleDateKey
        ? [selectedScheduleDateKey]
        : [];

    if (targetDateKeys.length === 0) {
      return;
    }

    const nextSchedules = { ...performanceSchedules };
    clearFieldError('schedule');
    targetDateKeys.forEach((dateKey) => {
      const currentTimes = nextSchedules[dateKey] ?? [];

      if (currentTimes.includes(timeValue)) {
        return;
      }

      nextSchedules[dateKey] = [...currentTimes, timeValue].sort();
    });

    setPerformanceSchedules(nextSchedules);
  };

  const handleScheduleQuickTimeSelect = (timeValue: string) => {
    setScheduleTimeInputValue(timeValue);
    setScheduleTimePeriod(getScheduleTimePeriod(timeValue));
    clearFieldError('schedule');

    if (selectedScheduleDateKeys.length === 0) {
      return;
    }

    const isEverySelectedDateRegistered = selectedScheduleDateKeys.every((dateKey) =>
      (performanceSchedules[dateKey] ?? []).includes(timeValue),
    );

    if (isEverySelectedDateRegistered) {
      setPerformanceSchedules((current) => {
        const nextSchedules = { ...current };

        selectedScheduleDateKeys.forEach((dateKey) => {
          const nextTimes = (nextSchedules[dateKey] ?? []).filter((entry) => entry !== timeValue);

          if (nextTimes.length === 0) {
            delete nextSchedules[dateKey];
            return;
          }

          nextSchedules[dateKey] = nextTimes;
        });

        return nextSchedules;
      });
      return;
    }

    handleScheduleTimeAdd(timeValue);
  };

  const handleAllPerformanceSchedulesClear = () => {
    setPerformanceSchedules({});
  };

  const handleScheduleTimeRemove = (dateKey: string, timeValue: string) => {
    setPerformanceSchedules((current) => {
      const nextTimes = (current[dateKey] ?? []).filter((entry) => entry !== timeValue);

      if (nextTimes.length === 0) {
        return Object.fromEntries(
          Object.entries(current).filter(([entryDateKey]) => entryDateKey !== dateKey),
        );
      }

      return {
        ...current,
        [dateKey]: nextTimes,
      };
    });
  };

  const handleSelectedScheduleClear = () => {
    if (!selectedScheduleDateKey) {
      return;
    }

    setPerformanceSchedules((current) => {
      return Object.fromEntries(
        Object.entries(current).filter(([dateKey]) => dateKey !== selectedScheduleDateKey),
      );
    });
  };

  return {
    selectedScheduleDate,
    setSelectedScheduleDate,
    selectedScheduleDateKeys,
    setSelectedScheduleDateKeys,
    performanceSchedules,
    setPerformanceSchedules,
    scheduleTimeInputValue,
    setScheduleTimeInputValue,
    scheduleTimePeriod,
    setScheduleTimePeriod,

    performanceScheduleDateKeys,
    selectedScheduleDateKey,
    selectedScheduleDateLabels,
    selectedScheduleTimes,
    visibleScheduleTimeQuickOptions,

    handleScheduleDateToggle,
    handleScheduleWeekdayToggle,
    handleScheduleTimeAdd,
    handleScheduleQuickTimeSelect,
    handleAllPerformanceSchedulesClear,
    handleScheduleTimeRemove,
    handleSelectedScheduleClear,
  };
};
