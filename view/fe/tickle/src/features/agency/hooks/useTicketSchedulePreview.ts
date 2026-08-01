'use client';

import { useMemo } from 'react';
import type {
  PerformanceScheduleMap,
  TicketSchedulePreview,
  TicketScheduleRule,
} from '@/src/features/agency/model/registrationTypes';
import {
  buildSessionEndAt,
  buildTicketScheduleDate,
  isValidScheduleTime,
  parseDateKey,
  withSelectedTime,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 등록된 회차마다 티켓 오픈·종료 시각을 계산합니다.
 *
 * <p>티켓 일정은 회차 시각에서 며칠 전이라는 규칙으로만 정해집니다. 그래서
 * 회차나 규칙이 바뀔 때마다 다시 계산해야 하고, 그 결과로 "오픈이 종료보다
 * 늦다" 같은 잘못된 조합도 판정합니다.</p>
 *
 * @param performanceCloseAt   공연 종료일. 회차 종료 시각을 정하는 데 쓴다
 * @param performanceSchedules 날짜별 회차 시각
 * @param ticketOpenRule       티켓 오픈 기준(공연일 며칠 전)
 * @param ticketCloseRule      티켓 종료 기준
 * @param selectedScheduleDateKeys 화면에서 고른 날짜. 미리보기를 이것만 보여준다
 */
export const useTicketSchedulePreview = ({
  performanceCloseAt,
  performanceSchedules,
  ticketOpenRule,
  ticketCloseRule,
  selectedScheduleDateKeys,
}: {
  performanceCloseAt: Date | null;
  performanceSchedules: PerformanceScheduleMap;
  ticketOpenRule: TicketScheduleRule;
  ticketCloseRule: TicketScheduleRule;
  selectedScheduleDateKeys: string[];
}) => {
const registeredTicketSchedulePreviews = useMemo<TicketSchedulePreview[]>(
  () => {
    if (!performanceCloseAt) {
      return [];
    }

    return Object.entries(performanceSchedules)
      .flatMap(([dateKey, times]) => {
        const scheduleDate = parseDateKey(dateKey);

        if (!scheduleDate) {
          return [];
        }

        return times
          .filter((timeValue) => isValidScheduleTime(timeValue))
          .map((timeValue) => {
            const scheduleAt = withSelectedTime(scheduleDate, timeValue);
            const sessionEndAt = buildSessionEndAt(scheduleAt, performanceCloseAt);

            return {
              id: `${dateKey}-${timeValue}`,
              dateKey,
              timeValue,
              scheduleAt,
              sessionEndAt,
              ticketOpenAt: buildTicketScheduleDate(scheduleAt, ticketOpenRule),
              ticketCloseAt: buildTicketScheduleDate(scheduleAt, ticketCloseRule),
            };
          });
      })
      .sort((left, right) => left.scheduleAt.getTime() - right.scheduleAt.getTime());
  },
  [performanceCloseAt, performanceSchedules, ticketCloseRule, ticketOpenRule],
);
const activeTicketSchedulePreviews = useMemo(
  () =>
    selectedScheduleDateKeys.length > 0
      ? registeredTicketSchedulePreviews.filter((preview) =>
          selectedScheduleDateKeys.includes(preview.dateKey),
        )
      : registeredTicketSchedulePreviews,
  [registeredTicketSchedulePreviews, selectedScheduleDateKeys],
);
const ticketSchedulePreviewItems = activeTicketSchedulePreviews.slice(0, 1);
const hasInvalidTicketWindow = registeredTicketSchedulePreviews.some(
  (preview) => preview.ticketOpenAt.getTime() >= preview.ticketCloseAt.getTime(),
);
const areTicketScheduleRulesComplete =
  ticketOpenRule.days.trim().length > 0 && ticketCloseRule.days.trim().length > 0;
const hasTicketWindowAfterScheduleStart = registeredTicketSchedulePreviews.some(
  (preview) =>
    preview.ticketOpenAt.getTime() >= preview.scheduleAt.getTime() ||
    preview.ticketCloseAt.getTime() > preview.scheduleAt.getTime(),
);


  return {
    registeredTicketSchedulePreviews,
    activeTicketSchedulePreviews,
    ticketSchedulePreviewItems,
    hasInvalidTicketWindow,
    areTicketScheduleRulesComplete,
    hasTicketWindowAfterScheduleStart,
  };
};
