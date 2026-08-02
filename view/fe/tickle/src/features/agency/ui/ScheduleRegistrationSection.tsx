'use client';

import type { RefObject } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import type { RegistrationErrorTarget } from '@/src/features/agency/model/registrationTypes';
import {
  formatDateKey,
  formatScheduleDateShortLabel,
  getScheduleTimePeriod,
  isValidScheduleTime,
  parseDateKey,
  scheduleWeekdayOptions,
} from '@/src/features/agency/model/registrationHelpers';
import type { useScheduleDraft } from '@/src/features/agency/hooks/useScheduleDraft';

/**
 * 공연 일정(회차) 등록 섹션입니다.
 *
 * <p>회차 편집 상태는 {@code useScheduleDraft}가 통째로 들고 있어 그대로
 * 받습니다. 값을 하나씩 풀어 넘기면 props가 20개를 넘어가 결합도가 그대로
 * 남습니다.</p>
 */
export const ScheduleRegistrationSection = ({
  schedule,
  activeRegistrationStep,
  performanceOpenAt,
  performanceCloseAt,
  registeredPerformanceCount,
  selectedScheduleDateCount,
  selectedDateLabel,
  registrationFieldErrorTarget,
  getRegistrationSectionHighlightClass,
  clearRegistrationFieldError,
  scheduleSectionRef,
  scheduleBlockRef,
}: {
  schedule: ReturnType<typeof useScheduleDraft>;
  activeRegistrationStep: number;
  performanceOpenAt: Date | null;
  performanceCloseAt: Date | null;
  registeredPerformanceCount: number;
  selectedScheduleDateCount: number;
  selectedDateLabel: string;
  registrationFieldErrorTarget: RegistrationErrorTarget | null;
  getRegistrationSectionHighlightClass: (target: RegistrationErrorTarget) => string;
  clearRegistrationFieldError: (target: RegistrationErrorTarget) => void;
  scheduleSectionRef: RefObject<HTMLDivElement | null>;
  scheduleBlockRef: RefObject<HTMLDivElement | null>;
}) => (
      <div
        ref={scheduleSectionRef}
        className={`rounded-[20px] ${getRegistrationSectionHighlightClass('schedule')}`}
        style={{
          display: activeRegistrationStep === 1 ? undefined : 'none',
          order: activeRegistrationStep === 1 ? 1 : undefined,
        }}
      >
        <Box
          variant="shadow"
          className="space-y-5"
        >
        <div
          ref={scheduleBlockRef}
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl"
        >
          <div>
            <h2 className="text-[18px] font-black text-slate-950">공연 일정 등록</h2>
          </div>
          <Badge color="blue" variant="outline">
            총 {registeredPerformanceCount}회차 등록
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <div className={`rounded-3xl border bg-surface-subtle p-4 ${
              registrationFieldErrorTarget === 'schedule' && schedule.selectedScheduleDateKeys.length === 0
                ? 'border-danger'
                : 'border-line'
            }`}>
              <div>
                <p className="text-sm font-bold text-content-tertiary">운영 날짜</p>
                <p className="mt-2 text-sm font-medium text-content-secondary">
                  {performanceOpenAt && performanceCloseAt
                    ? `${formatDateKey(performanceOpenAt)} ~ ${formatDateKey(performanceCloseAt)}`
                    : '공연 오픈일과 종료일을 먼저 입력해 주세요.'}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-content-tertiary">요일 선택</p>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1.5">
                  {scheduleWeekdayOptions.map((option) => {
                    const weekdayDateKeys = schedule.performanceScheduleDateKeys.filter((dateKey) => {
                      const scheduleDate = parseDateKey(dateKey);
                      return scheduleDate?.getDay() === option.weekday;
                    });
                    const selectedCount = weekdayDateKeys.filter((dateKey) =>
                      schedule.selectedScheduleDateKeys.includes(dateKey),
                    ).length;
                    const isEverySelected = weekdayDateKeys.length > 0 && selectedCount === weekdayDateKeys.length;
                    const isPartiallySelected = selectedCount > 0 && !isEverySelected;

                    return (
                      <button
                        key={option.weekday}
                        type="button"
                        onClick={() => schedule.handleScheduleWeekdayToggle(option.weekday)}
                        disabled={weekdayDateKeys.length === 0}
                        aria-pressed={isEverySelected}
                        className={`rounded-xl px-2 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          isEverySelected
                            ? 'bg-primary text-white'
                            : isPartiallySelected
                              ? 'bg-primary-subtle text-primary-hover ring-1 ring-primary-light'
                              : 'bg-surface-subtle text-content-secondary hover:bg-surface-muted'
                        }`}
                        title={`${option.label}요일 ${selectedCount}/${weekdayDateKeys.length}일 선택`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {schedule.performanceScheduleDateKeys.map((dateKey) => {
                  const scheduleDate = parseDateKey(dateKey);

                  if (!scheduleDate) {
                    return null;
                  }

                  const isSelected = schedule.selectedScheduleDateKeys.includes(dateKey);
                  const scheduleCount = schedule.performanceSchedules[dateKey]?.length ?? 0;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => schedule.handleScheduleDateToggle(dateKey)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary-subtle'
                          : 'border-line bg-surface hover:border-line-strong hover:bg-surface-subtle'
                      }`}
                    >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isSelected ? 'bg-primary' : 'bg-surface-active'
                            }`}
                          />
                          <p className="text-sm font-black text-slate-950">
                            {formatScheduleDateShortLabel(scheduleDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-bold text-content-tertiary">
                            {scheduleCount}회
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-medium text-content-muted">{dateKey}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-surface-subtle p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-content-tertiary">선택 날짜</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {selectedScheduleDateCount > 1
                      ? `${selectedScheduleDateCount}일 선택`
                      : selectedDateLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={schedule.handleAllPerformanceSchedulesClear}
                  disabled={registeredPerformanceCount === 0}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  전체 초기화
                </button>
              </div>

              {schedule.selectedScheduleDateLabels.length > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {schedule.selectedScheduleDateLabels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex h-8 items-center justify-center rounded-full bg-surface px-3 text-center text-xs font-bold text-content-tertiary ring-1 ring-black/5"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-sm font-medium text-content-muted">
                  날짜 미선택
                </div>
              )}

              <div className="mt-5 rounded-3xl border border-line bg-surface p-4">
                <div>
                  <div>
                    <p className="text-sm font-black text-content-secondary">30분 단위 선택</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 rounded-2xl bg-surface-muted p-1">
                  {(['am', 'pm'] as const).map((period) => {
                    const isActive = schedule.scheduleTimePeriod === period;

                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => schedule.setScheduleTimePeriod(period)}
                        className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                          isActive
                            ? 'bg-surface text-slate-950 shadow-sm'
                            : 'text-content-tertiary hover:bg-surface/60 hover:text-content-secondary'
                        }`}
                      >
                        {period === 'am' ? '오전' : '오후'}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 grid max-h-[180px] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 lg:grid-cols-6">
                  {schedule.visibleScheduleTimeQuickOptions.map((timeValue) => {
                    const isRegisteredOnSelectedDate =
                      schedule.selectedScheduleDateKeys.length > 0
                        ? schedule.selectedScheduleDateKeys.every((dateKey) =>
                            (schedule.performanceSchedules[dateKey] ?? []).includes(timeValue),
                          )
                        : schedule.selectedScheduleTimes.includes(timeValue);

                    return (
                      <button
                        key={timeValue}
                        type="button"
                        onClick={() => schedule.handleScheduleQuickTimeSelect(timeValue)}
                        aria-pressed={isRegisteredOnSelectedDate}
                        className={`rounded-2xl border px-3 py-2 text-sm font-black transition ${
                          isRegisteredOnSelectedDate
                            ? 'border-2 border-primary bg-surface text-content-secondary'
                            : 'border-line bg-surface text-content-secondary hover:border-line-strong hover:bg-surface-subtle'
                        }`}
                      >
                        {timeValue}
                      </button>
                    );
                  })}
                </div>

                {selectedScheduleDateCount === 0 ? (
                  <p className="mt-3 text-xs font-semibold text-warning">
                    날짜 선택 필요
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-end">
                <label className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-sm font-bold text-content-tertiary">직접 입력</span>
                  <input
                    type="time"
                    step={60}
                    value={schedule.scheduleTimeInputValue}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      schedule.setScheduleTimeInputValue(nextValue);
                      clearRegistrationFieldError('schedule');

                      if (isValidScheduleTime(nextValue)) {
                        schedule.setScheduleTimePeriod(getScheduleTimePeriod(nextValue));
                      }
                    }}
                    className={`rounded-2xl border bg-surface px-4 py-3 text-sm font-semibold text-content outline-none transition focus:ring-4 ${
                      registrationFieldErrorTarget === 'schedule'
                        ? 'border-danger focus:border-danger focus:ring-danger-light'
                        : 'border-line focus:border-primary focus:ring-primary-light'
                    }`}
                  />
                </label>
                <Button
                  color="primary"
                  size="medium"
                  disabled={selectedScheduleDateCount === 0 || !isValidScheduleTime(schedule.scheduleTimeInputValue)}
                  onClick={() => schedule.handleScheduleTimeAdd()}
                >
                  선택 날짜에 회차 추가
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-content-tertiary">등록된 공연 시간</p>
              </div>
              {schedule.selectedScheduleTimes.length > 0 ? (
                <button
                  type="button"
                  onClick={schedule.handleSelectedScheduleClear}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary"
                >
                  선택 날짜 초기화
                </button>
              ) : null}
            </div>

            {schedule.selectedScheduleTimes.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {schedule.selectedScheduleTimes.map((timeValue) => (
                  <div
                    key={timeValue}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface-subtle px-4 py-3"
                  >
                    <span className="text-base font-black text-slate-950">{timeValue}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (schedule.selectedScheduleDateKey) {
                          schedule.handleScheduleTimeRemove(schedule.selectedScheduleDateKey, timeValue);
                        }
                      }}
                      className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-content-tertiary ring-1 ring-black/5 transition hover:bg-surface-muted hover:text-content-secondary"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-subtle px-4 py-6 text-sm font-medium text-content-tertiary">
                회차 없음
              </div>
            )}
          </div>
        </div>
        </Box>
      </div>
);
