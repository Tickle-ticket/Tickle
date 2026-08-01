'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Calendar } from '@/src/shared/components/Calendar';
import { Modal } from '@/src/shared/components/Modal';
import {
  buildEnabledDateRange,
  ensureDateRangeOrder,
  formatDateKey,
  formatDateTimeLabel,
  formatTimeValue,
  parseDateKey,
  withSelectedDate,
  withSelectedTime,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 공연 기간과 회차 시각을 함께 고르는 모달입니다.
 */
export function DateRangeModal({
  isOpen,
  title,
  description,
  startLabel,
  endLabel,
  initialStartAt,
  initialEndAt,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  startLabel: string;
  endLabel: string;
  initialStartAt: Date;
  initialEndAt: Date;
  onClose: () => void;
  onConfirm: (nextStartAt: Date, nextEndAt: Date) => void;
}) {
  const [draftStartAt, setDraftStartAt] = useState(() => new Date(initialStartAt));
  const [draftEndAt, setDraftEndAt] = useState(() => new Date(initialEndAt));
  const [startDateText, setStartDateText] = useState(() => formatDateKey(initialStartAt));
  const [endDateText, setEndDateText] = useState(() => formatDateKey(initialEndAt));
  const startCalendarRangeStartYear = Math.min(
    new Date().getFullYear(),
    initialStartAt.getFullYear(),
    draftStartAt.getFullYear(),
  ) - 1;

  const startEnabledDates = useMemo(
    () => buildEnabledDateRange(new Date(startCalendarRangeStartYear, 0, 1), 366 * 6),
    [startCalendarRangeStartYear],
  );

  const endEnabledDates = useMemo(
    () => buildEnabledDateRange(
      new Date(draftStartAt.getFullYear(), draftStartAt.getMonth(), draftStartAt.getDate()),
      540,
    ),
    [draftStartAt],
  );

  const handleStartDateSelect = (date: Date) => {
    const nextStartAt = withSelectedDate(date, draftStartAt);
    const nextEndAt = ensureDateRangeOrder(nextStartAt, draftEndAt);

    setDraftStartAt(nextStartAt);
    setStartDateText(formatDateKey(nextStartAt));
    setDraftEndAt(nextEndAt);
    setEndDateText(formatDateKey(nextEndAt));
  };

  const handleEndDateSelect = (date: Date) => {
    const nextEndAt = withSelectedDate(date, draftEndAt);
    setEndDateText(formatDateKey(nextEndAt));
    setDraftEndAt(ensureDateRangeOrder(draftStartAt, nextEndAt));
  };

  const handleStartTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextStartAt = withSelectedTime(draftStartAt, event.target.value);

    setDraftStartAt(nextStartAt);
    setDraftEndAt((current) => ensureDateRangeOrder(nextStartAt, current));
  };

  const handleEndTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextEndAt = withSelectedTime(draftEndAt, event.target.value);
    setDraftEndAt(ensureDateRangeOrder(draftStartAt, nextEndAt));
  };

  const handleStartDateTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setStartDateText(nextValue);

    const parsedDate = parseDateKey(nextValue);
    if (!parsedDate) {
      return;
    }

    const nextStartAt = withSelectedDate(parsedDate, draftStartAt);
    const nextEndAt = ensureDateRangeOrder(nextStartAt, draftEndAt);

    setDraftStartAt(nextStartAt);
    setDraftEndAt(nextEndAt);
    setEndDateText(formatDateKey(nextEndAt));
  };

  const handleEndDateTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setEndDateText(nextValue);

    const parsedDate = parseDateKey(nextValue);
    if (!parsedDate) {
      return;
    }

    const nextEndAt = ensureDateRangeOrder(
      draftStartAt,
      withSelectedDate(parsedDate, draftEndAt),
    );

    setDraftEndAt(nextEndAt);
    setEndDateText(formatDateKey(nextEndAt));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      cancelText="닫기"
      confirmText="적용하기"
      onCancel={onClose}
      onConfirm={() => onConfirm(draftStartAt, draftEndAt)}
      className="!max-w-[960px] !rounded-[28px] !p-4 sm:!p-5"
    >
      <div className="w-full text-left">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge color="blue" variant="outline">좌측</Badge>
              <span className="text-sm font-bold text-content-tertiary">{startLabel}</span>
            </div>
            <p className="mt-2 text-base font-black text-slate-950">{formatDateTimeLabel(draftStartAt)}</p>

            <div className="mt-3">
              <Calendar
                density="compact"
                enabledDates={startEnabledDates}
                selectedDate={draftStartAt}
                onSelect={handleStartDateSelect}
                className="!max-w-none border border-line shadow-[0_18px_46px_rgba(15,23,42,0.08)]"
              />
            </div>

            <label className="mt-3 flex flex-col gap-2">
              <span className="text-sm font-bold text-content-tertiary">시작 날짜</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={startDateText}
                onChange={handleStartDateTextChange}
                onBlur={() => setStartDateText(formatDateKey(draftStartAt))}
                className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold tracking-[0.18em] text-content outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
              />
            </label>

            <label className="mt-3 flex flex-col gap-2">
              <span className="text-sm font-bold text-content-tertiary">시작 시간</span>
              <input
                type="time"
                step={600}
                value={formatTimeValue(draftStartAt)}
                onChange={handleStartTimeChange}
                className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-content outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-line bg-surface-subtle p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge color="grey" variant="outline">우측</Badge>
              <span className="text-sm font-bold text-content-tertiary">{endLabel}</span>
            </div>
            <p className="mt-2 text-base font-black text-slate-950">{formatDateTimeLabel(draftEndAt)}</p>

            <div className="mt-3">
              <Calendar
                density="compact"
                enabledDates={endEnabledDates}
                selectedDate={draftEndAt}
                onSelect={handleEndDateSelect}
                className="!max-w-none border border-line shadow-[0_18px_46px_rgba(15,23,42,0.08)]"
              />
            </div>

            <label className="mt-3 flex flex-col gap-2">
              <span className="text-sm font-bold text-content-tertiary">종료 날짜</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={endDateText}
                onChange={handleEndDateTextChange}
                onBlur={() => setEndDateText(formatDateKey(draftEndAt))}
                className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold tracking-[0.18em] text-content outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
              />
            </label>

            <label className="mt-3 flex flex-col gap-2">
              <span className="text-sm font-bold text-content-tertiary">종료 시간</span>
              <input
                type="time"
                step={600}
                value={formatTimeValue(draftEndAt)}
                onChange={handleEndTimeChange}
                className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-content outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
              />
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
