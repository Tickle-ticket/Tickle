'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  AgencySeatPolicyModal,
  type AgencySeatAssignmentMode,
  createDefaultAgencySeatPolicy,
  getAgencySeatPolicySummary,
} from '@/src/shared/components/AgencySeatPolicyModal';
import { submitAgencyEventRegistration } from '@/src/shared/api/agencyApi';
import { fetchCategories } from '@/src/shared/api/eventApi';
import type { AgencyRegistrationFlowRequest, AgencySeatGrade } from '@/src/shared/api/types/agency.types';
import type { Category } from '@/src/shared/api/types/event.types';
import { ApiError } from '@/src/shared/api/types';
import { useVenues } from '@/src/shared/api/useVenues';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Calendar } from '@/src/shared/components/Calendar';
import { Input } from '@/src/shared/components/Input';
import { Modal } from '@/src/shared/components/Modal';
import { PerformanceScheduleAddedModal } from '@/src/shared/components/PerformanceScheduleAddedModal';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { STAGE_4001_SEAT_IDS } from '@/src/shared/components/Stage_4001';

const DEFAULT_PERFORMANCE_TITLE = '뮤지컬 Tikkle Original2';
const DEFAULT_SESSION_DURATION_MINUTES = 60;

type VenueOption = {
  value: number;
  label: string;
  region?: string;
  capacity?: string;
};

const registrationStepItems = [
  {
    title: '노출/기본 정보',
    sections: '노출 콘텐츠, 기본 정보',
    detail: '카테고리를 포함한 기본 정보를 먼저 입력합니다.',
  },
  {
    title: '티켓/공연 일정',
    sections: '티켓 일정 기준, 공연 일정 등록',
    detail: '예매 오픈/종료 기준과 회차 일정을 설정합니다.',
  },
  {
    title: '판매/좌석 설정',
    sections: '판매 정책, 좌석 등급/비활성 설정',
    detail: '좌석 금액과 좌석 운영 정책을 마무리합니다.',
  },
];

const maxPerformanceHashtagCount = 3;

type SeatGradeKey = 'vip' | 'r' | 's' | 'a';
type SupportedAgencySeatGrade = Exclude<AgencySeatGrade, 'B'>;

const seatGradeFields: Array<{
  key: SeatGradeKey;
  label: string;
  badgeColor: 'red' | 'blue' | 'green' | 'grey' | 'purple';
  description: string;
}> = [
  { key: 'vip', label: 'VIP석', badgeColor: 'red', description: '가장 높은 등급의 프리미엄 좌석' },
  { key: 'r', label: 'R석', badgeColor: 'blue', description: '무대 중심 시야 구간' },
  { key: 's', label: 'S석', badgeColor: 'green', description: '일반 판매 핵심 구간' },
  { key: 'a', label: 'A석', badgeColor: 'grey', description: '입문형 가격대 좌석' },
];

const seatPriceGradeToApiGrade: Record<SeatGradeKey, SupportedAgencySeatGrade> = {
  vip: 'VIP',
  r: 'R',
  s: 'S',
  a: 'A',
};

const seatPolicyGradeToApiGrade: Record<
  Exclude<AgencySeatAssignmentMode, 'disabled'>,
  SupportedAgencySeatGrade
> = {
  VIP: 'VIP',
  R: 'R',
  S: 'S',
  A: 'A',
};

const mockSeatIdByLabel = new Map(STAGE_4001_SEAT_IDS.map((seatLabel, index) => [seatLabel, index + 1]));
const fallbackVenueOption: VenueOption = {
  value: 0,
  label: '공연장 선택',
};

const resolveDefaultCategoryId = (categories: Category[]) => {
  if (categories.length === 0) {
    return '';
  }

  const preferredCategory = categories.find((category) => {
    const normalizedName = category.categoryName.trim().toLowerCase();
    return normalizedName === '뮤지컬' || normalizedName === 'musical';
  });

  return String(preferredCategory?.categoryId ?? categories[0]?.categoryId ?? '');
};

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!matched) {
    return null;
  }

  const [, yearText, monthText, dayText] = matched;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const formatDateTimeLabel = (value: Date) => {
  const dateLabel = formatDateKey(value);
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${dateLabel} ${hours}:${minutes}`;
};

const parseDateTimeLabel = (value: string) => {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);

  if (!matched) {
    return null;
  }

  const [, yearText, monthText, dayText, hoursText, minutesText] = matched;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hours, minutes);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const formatTimeValue = (value: Date) => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const buildEnabledDateRange = (startDate: Date, totalDays: number) => {
  const dates: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  for (let index = 0; index < totalDays; index += 1) {
    const nextDate = new Date(cursor);
    nextDate.setDate(cursor.getDate() + index);
    dates.push(formatDateKey(nextDate));
  }

  return dates;
};

const withSelectedDate = (selectedDate: Date, sourceDate: Date) => {
  const nextDate = new Date(sourceDate);
  nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  return nextDate;
};

const withSelectedTime = (sourceDate: Date, timeValue: string) => {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const nextDate = new Date(sourceDate);

  if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
    nextDate.setHours(hours, minutes, 0, 0);
  }

  return nextDate;
};

const ensureDateRangeOrder = (startAt: Date, endAt: Date) =>
  endAt.getTime() < startAt.getTime() ? new Date(startAt) : endAt;

type IntroImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type PerformanceScheduleMap = Record<string, string[]>;

type AddedScheduleNotice = {
  timeValue: string;
  dateLabels: string[];
};

type TicketScheduleRule = {
  days: number;
};

type TicketSchedulePreview = {
  id: string;
  dateKey: string;
  timeValue: string;
  scheduleAt: Date;
  ticketOpenAt: Date;
  ticketCloseAt: Date;
};

const createIntroImageKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

const normalizeHashtag = (value: string) => value.trim().replace(/^#+/, '').replace(/\s+/g, '');
const parseOffsetDayValue = (value: string) => {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};

const withTimeFromDate = (sourceDate: Date, timeSourceDate: Date) => {
  const nextDate = new Date(sourceDate);
  nextDate.setHours(timeSourceDate.getHours(), timeSourceDate.getMinutes(), 0, 0);
  return nextDate;
};

const buildTicketScheduleDate = (
  scheduleAt: Date,
  rule: TicketScheduleRule,
  timeSourceDate: Date,
) => {
  const nextDate = new Date(scheduleAt);
  nextDate.setDate(nextDate.getDate() - rule.days);
  return withTimeFromDate(nextDate, timeSourceDate);
};

const buildSessionEndAt = (scheduleAt: Date, fallbackEndTimeSource: Date) => {
  const nextEndAt = withTimeFromDate(scheduleAt, fallbackEndTimeSource);

  if (nextEndAt.getTime() > scheduleAt.getTime()) {
    return nextEndAt;
  }

  const fallbackEndAt = new Date(scheduleAt);
  fallbackEndAt.setMinutes(fallbackEndAt.getMinutes() + DEFAULT_SESSION_DURATION_MINUTES);
  return fallbackEndAt;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) {
    return `${new Intl.NumberFormat('ko-KR').format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  }

  const megaBytes = bytes / (1024 * 1024);
  return `${megaBytes >= 10 ? megaBytes.toFixed(0) : megaBytes.toFixed(1)} MB`;
};

const buildDateKeysBetween = (startAt: Date, endAt: Date) => {
  const dates: string[] = [];
  const startDate = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
  const endDate = new Date(endAt.getFullYear(), endAt.getMonth(), endAt.getDate());

  for (
    let cursor = new Date(startDate);
    cursor.getTime() <= endDate.getTime();
    cursor.setDate(cursor.getDate() + 1)
  ) {
    dates.push(formatDateKey(cursor));
  }

  return dates;
};

const formatScheduleDateShortLabel = (value: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(value);

const formatScheduleDateTimePreviewLabel = (value: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);

const isValidScheduleTime = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

const createImagePreviewItem = (file: File): IntroImageItem => ({
  id: createIntroImageKey(file),
  file,
  previewUrl: URL.createObjectURL(file),
});

function DateTimeTriggerField({
  label,
  value,
  onChange,
  onBlur,
  onOpen,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onOpen: () => void;
}) {
  const inputId = useId();

  return (
    <div className="relative flex w-full flex-col gap-1">
      <label htmlFor={inputId} className="mb-1 text-[13px] font-medium text-gray-500">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="YYYY-MM-DD HH:mm"
          className={`
            w-full border-b-[2px] bg-transparent py-1 pr-11 text-[20px] text-gray-900 outline-none
            transition-colors tracking-[0.08em] placeholder:text-gray-300 border-gray-300 sm:text-[22px]
            hover:border-slate-400 focus:border-blue-500
          `}
        />
        <button
          type="button"
          className="absolute bottom-1 right-0 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={`${label} 달력 열기`}
          onClick={onOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TicketScheduleRuleField({
  label,
  description,
  rule,
  onDaysChange,
}: {
  label: string;
  description: string;
  rule: TicketScheduleRule;
  onDaysChange: (days: number) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950">{label}</p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
        </div>
        <Badge color="blue" variant="outline">
          공연일 {rule.days}일 전
        </Badge>
      </div>

      <div className="mt-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.08em] text-slate-400">공연일 기준 일수</span>
          <input
            type="number"
            min={0}
            step={1}
            value={rule.days}
            onChange={(event) => onDaysChange(parseOffsetDayValue(event.target.value))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>
      </div>
    </div>
  );
}

function DateRangeModal({
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

  const startEnabledDates = useMemo(
    () => buildEnabledDateRange(new Date(draftStartAt.getFullYear(), draftStartAt.getMonth(), 1), 540),
    [draftStartAt],
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
      className="!max-w-[960px] !rounded-[32px] !p-6"
    >
      <div className="w-full text-left">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge color="blue" variant="outline">좌측</Badge>
              <span className="text-sm font-bold text-slate-500">{startLabel}</span>
            </div>
            <p className="mt-3 text-lg font-black text-slate-950">{formatDateTimeLabel(draftStartAt)}</p>

            <div className="mt-4">
              <Calendar
                enabledDates={startEnabledDates}
                selectedDate={draftStartAt}
                onSelect={handleStartDateSelect}
                className="!max-w-none border border-slate-200 shadow-[0_18px_46px_rgba(15,23,42,0.08)]"
              />
            </div>

            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-500">시작 날짜</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={startDateText}
                onChange={handleStartDateTextChange}
                onBlur={() => setStartDateText(formatDateKey(draftStartAt))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold tracking-[0.18em] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-500">시작 시간</span>
              <input
                type="time"
                step={600}
                value={formatTimeValue(draftStartAt)}
                onChange={handleStartTimeChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge color="grey" variant="outline">우측</Badge>
              <span className="text-sm font-bold text-slate-500">{endLabel}</span>
            </div>
            <p className="mt-3 text-lg font-black text-slate-950">{formatDateTimeLabel(draftEndAt)}</p>

            <div className="mt-4">
              <Calendar
                enabledDates={endEnabledDates}
                selectedDate={draftEndAt}
                onSelect={handleEndDateSelect}
                className="!max-w-none border border-slate-200 shadow-[0_18px_46px_rgba(15,23,42,0.08)]"
              />
            </div>

            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-500">종료 날짜</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={endDateText}
                onChange={handleEndDateTextChange}
                onBlur={() => setEndDateText(formatDateKey(draftEndAt))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold tracking-[0.18em] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-500">종료 시간</span>
              <input
                type="time"
                step={600}
                value={formatTimeValue(draftEndAt)}
                onChange={handleEndTimeChange}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function AgencyRegistrationPage() {
  const { data: venueList = [], isLoading: isVenueListLoading } = useVenues();
  const [activeRegistrationStep, setActiveRegistrationStep] = useState(0);
  const [performanceTitle, setPerformanceTitle] = useState(DEFAULT_PERFORMANCE_TITLE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isCategoryListLoading, setIsCategoryListLoading] = useState(true);
  const [categoryListErrorMessage, setCategoryListErrorMessage] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);
  const [isVenueOpen, setIsVenueOpen] = useState(false);
  const [ticketOpenRule, setTicketOpenRule] = useState<TicketScheduleRule>({
    days: 14,
  });
  const [ticketCloseRule, setTicketCloseRule] = useState<TicketScheduleRule>({
    days: 0,
  });
  const [performanceOpenAt, setPerformanceOpenAt] = useState(() => new Date('2026-05-08T19:30:00'));
  const [performanceCloseAt, setPerformanceCloseAt] = useState(() => new Date('2026-06-21T18:00:00'));
  const [performanceOpenInputValue, setPerformanceOpenInputValue] = useState(() => formatDateTimeLabel(new Date('2026-05-08T19:30:00')));
  const [performanceCloseInputValue, setPerformanceCloseInputValue] = useState(() => formatDateTimeLabel(new Date('2026-06-21T18:00:00')));
  const [posterImage, setPosterImage] = useState<IntroImageItem | null>(null);
  const [isPosterImageDragActive, setIsPosterImageDragActive] = useState(false);
  const [introImages, setIntroImages] = useState<IntroImageItem[]>([]);
  const [isIntroImageDragActive, setIsIntroImageDragActive] = useState(false);
  const [noticeText, setNoticeText] = useState(
    '예매 오픈 전 최종 검수 후 노출되는 운영 공지사항을 입력합니다.',
  );
  const [performanceHashtags, setPerformanceHashtags] = useState<string[]>([]);
  const [hashtagInputValue, setHashtagInputValue] = useState('');
  const [seatPrices, setSeatPrices] = useState<Record<SeatGradeKey, string>>({
    vip: '180000',
    r: '140000',
    s: '110000',
    a: '80000',
  });
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);
  const [selectedScheduleDateKeys, setSelectedScheduleDateKeys] = useState<string[]>([]);
  const [performanceSchedules, setPerformanceSchedules] = useState<PerformanceScheduleMap>({});
  const [scheduleTimeInputValue, setScheduleTimeInputValue] = useState('19:30');
  const [addedScheduleNotice, setAddedScheduleNotice] = useState<AddedScheduleNotice | null>(null);
  const [isSeatPolicyModalOpen, setIsSeatPolicyModalOpen] = useState(false);
  const [isPerformanceDateModalOpen, setIsPerformanceDateModalOpen] = useState(false);
  const [seatPolicy, setSeatPolicy] = useState(() => createDefaultAgencySeatPolicy());
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [registrationErrorMessage, setRegistrationErrorMessage] = useState<string | null>(null);
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(null);
  const venueDropdownRef = useRef<HTMLDivElement | null>(null);
  const posterImageInputRef = useRef<HTMLInputElement | null>(null);
  const posterImageRegistryRef = useRef<IntroImageItem | null>(null);
  const posterImageDragDepthRef = useRef(0);
  const introImageInputRef = useRef<HTMLInputElement | null>(null);
  const introImageRegistryRef = useRef<IntroImageItem[]>([]);
  const introImageDragDepthRef = useRef(0);
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.categoryName,
        value: String(category.categoryId),
      })),
    [categories],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setIsCategoryListLoading(true);
      setCategoryListErrorMessage(null);

      try {
        const response = await fetchCategories();
        if (cancelled) {
          return;
        }

        const nextCategories = response.data.categories;
        setCategories(nextCategories);
        setSelectedCategoryId((current) => {
          if (current && nextCategories.some((category) => String(category.categoryId) === current)) {
            return current;
          }

          return resolveDefaultCategoryId(nextCategories);
        });

        if (nextCategories.length === 0) {
          setCategoryListErrorMessage('카테고리 목록이 비어 있습니다.');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCategoryListErrorMessage(
          error instanceof ApiError ? error.message : '카테고리 목록을 불러오지 못했습니다.',
        );
      } finally {
        if (!cancelled) {
          setIsCategoryListLoading(false);
        }
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueOptions = useMemo<VenueOption[]>(
    () =>
      venueList.map((venue) => ({
        value: venue.venueId,
        label: venue.venueName,
      })),
    [venueList],
  );
  const resolvedSelectedVenue = useMemo(() => {
    if (selectedVenue !== null && venueOptions.some((venue) => venue.value === selectedVenue)) {
      return selectedVenue;
    }

    return venueOptions[0]?.value ?? null;
  }, [selectedVenue, venueOptions]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedScheduleDate) {
      return '미선택';
    }

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(selectedScheduleDate);
  }, [selectedScheduleDate]);

  const performanceScheduleDateKeys = useMemo(
    () => buildDateKeysBetween(performanceOpenAt, performanceCloseAt),
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

  const registeredPerformanceCount = useMemo(
    () => Object.values(performanceSchedules).reduce((total, times) => total + times.length, 0),
    [performanceSchedules],
  );
  const selectedScheduleDateCount = selectedScheduleDateKeys.length;

  const selectedVenueInfo = useMemo(
    () =>
      venueOptions.find((venue) => venue.value === resolvedSelectedVenue) ??
      venueOptions[0] ??
      fallbackVenueOption,
    [resolvedSelectedVenue, venueOptions],
  );
  const selectedCategoryInfo = useMemo(
    () => categories.find((category) => String(category.categoryId) === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const registeredTicketSchedulePreviews = useMemo<TicketSchedulePreview[]>(
    () =>
      Object.entries(performanceSchedules)
        .flatMap(([dateKey, times]) => {
          const scheduleDate = parseDateKey(dateKey);

          if (!scheduleDate) {
            return [];
          }

          return times
            .filter((timeValue) => isValidScheduleTime(timeValue))
            .map((timeValue) => {
              const scheduleAt = withSelectedTime(scheduleDate, timeValue);

              return {
                id: `${dateKey}-${timeValue}`,
                dateKey,
                timeValue,
                scheduleAt,
                ticketOpenAt: buildTicketScheduleDate(
                  scheduleAt,
                  ticketOpenRule,
                  performanceOpenAt,
                ),
                ticketCloseAt: buildTicketScheduleDate(
                  scheduleAt,
                  ticketCloseRule,
                  performanceCloseAt,
                ),
              };
            });
        })
        .sort((left, right) => left.scheduleAt.getTime() - right.scheduleAt.getTime()),
    [performanceCloseAt, performanceOpenAt, performanceSchedules, ticketCloseRule, ticketOpenRule],
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
  const ticketSchedulePreviewItems = activeTicketSchedulePreviews.slice(0, 3);
  const hiddenTicketSchedulePreviewCount = Math.max(0, activeTicketSchedulePreviews.length - ticketSchedulePreviewItems.length);
  const hasInvalidTicketWindow = registeredTicketSchedulePreviews.some(
    (preview) => preview.ticketOpenAt.getTime() >= preview.ticketCloseAt.getTime(),
  );
  const hasTicketWindowAfterScheduleStart = registeredTicketSchedulePreviews.some(
    (preview) =>
      preview.ticketOpenAt.getTime() >= preview.scheduleAt.getTime() ||
      preview.ticketCloseAt.getTime() >= preview.scheduleAt.getTime(),
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!venueDropdownRef.current?.contains(event.target as Node)) {
        setIsVenueOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const previousImages = introImageRegistryRef.current;

    previousImages
      .filter((image) => !introImages.some((currentImage) => currentImage.id === image.id))
      .forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });

    introImageRegistryRef.current = introImages;
  }, [introImages]);

  useEffect(() => {
    const previousImage = posterImageRegistryRef.current;

    if (previousImage && previousImage.id !== posterImage?.id) {
      URL.revokeObjectURL(previousImage.previewUrl);
    }

    posterImageRegistryRef.current = posterImage;
  }, [posterImage]);

  useEffect(
    () => () => {
      if (posterImageRegistryRef.current) {
        URL.revokeObjectURL(posterImageRegistryRef.current.previewUrl);
      }

      introImageRegistryRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    },
    [],
  );

  const seatPriceSummary = useMemo(
    () =>
      seatGradeFields.map((field) => ({
        ...field,
        formattedValue:
          seatPrices[field.key].length > 0
            ? new Intl.NumberFormat('ko-KR').format(Number(seatPrices[field.key]))
            : '0',
      })),
    [seatPrices],
  );

  const seatPolicySummary = useMemo(() => getAgencySeatPolicySummary(seatPolicy), [seatPolicy]);
  const introImageCountLabel =
    introImages.length > 0 ? `등록된 이미지 ${introImages.length}장` : '아직 등록된 이미지가 없습니다.';
  const posterImageLabel = posterImage ? '포스터 이미지가 등록되었습니다.' : '아직 등록된 포스터가 없습니다.';
  const normalizedHashtagInput = normalizeHashtag(hashtagInputValue);
  const formattedHashtagInput = normalizedHashtagInput ? `#${normalizedHashtagInput}` : '';
  const isFirstRegistrationStep = activeRegistrationStep === 0;
  const isLastRegistrationStep = activeRegistrationStep === registrationStepItems.length - 1;
  const canSubmitRegistration =
    performanceTitle.trim().length > 0 &&
    selectedCategoryId.length > 0 &&
    resolvedSelectedVenue !== null &&
    posterImage !== null &&
    registeredTicketSchedulePreviews.length > 0 &&
    !hasInvalidTicketWindow &&
    !isVenueListLoading &&
    !isCategoryListLoading;
  const canAddHashtag =
    formattedHashtagInput.length > 1 &&
    performanceHashtags.length < maxPerformanceHashtagCount &&
    !performanceHashtags.includes(formattedHashtagInput);

  const formatSeatPriceInput = (value: string) => {
    if (value.length === 0) {
      return '';
    }

    return new Intl.NumberFormat('ko-KR').format(Number(value));
  };

  const openIntroImagePicker = () => {
    introImageInputRef.current?.click();
  };

  const openPosterImagePicker = () => {
    posterImageInputRef.current?.click();
  };

  const replacePosterImage = (files: File[]) => {
    const nextPosterFile = files.find((file) => file.type.startsWith('image/'));

    if (!nextPosterFile) {
      return;
    }

    setPosterImage(createImagePreviewItem(nextPosterFile));
  };

  const appendIntroImages = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      return;
    }

    setIntroImages((current) => {
      const existingKeys = new Set(current.map((image) => image.id));
      const nextImages = imageFiles
        .filter((file) => !existingKeys.has(createIntroImageKey(file)))
        .map((file) => createImagePreviewItem(file));

      return [...current, ...nextImages];
    });
  };

  const handlePosterImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    replacePosterImage(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handlePosterImageRemove = () => {
    setPosterImage(null);
  };

  const handlePosterImageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    posterImageDragDepthRef.current += 1;
    setIsPosterImageDragActive(true);
  };

  const handlePosterImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

    if (!isPosterImageDragActive) {
      setIsPosterImageDragActive(true);
    }
  };

  const handlePosterImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    posterImageDragDepthRef.current = Math.max(0, posterImageDragDepthRef.current - 1);

    if (posterImageDragDepthRef.current === 0) {
      setIsPosterImageDragActive(false);
    }
  };

  const handlePosterImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    posterImageDragDepthRef.current = 0;
    setIsPosterImageDragActive(false);
    replacePosterImage(Array.from(event.dataTransfer.files));
  };

  const handleIntroImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    appendIntroImages(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handleIntroImageRemove = (imageId: string) => {
    setIntroImages((current) => current.filter((image) => image.id !== imageId));
  };

  const handleIntroImageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    introImageDragDepthRef.current += 1;
    setIsIntroImageDragActive(true);
  };

  const handleIntroImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

    if (!isIntroImageDragActive) {
      setIsIntroImageDragActive(true);
    }
  };

  const handleIntroImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    introImageDragDepthRef.current = Math.max(0, introImageDragDepthRef.current - 1);

    if (introImageDragDepthRef.current === 0) {
      setIsIntroImageDragActive(false);
    }
  };

  const handleIntroImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    introImageDragDepthRef.current = 0;
    setIsIntroImageDragActive(false);
    appendIntroImages(Array.from(event.dataTransfer.files));
  };

  const handleSeatPriceChange =
    (grade: SeatGradeKey) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = event.target.value.replace(/\D/g, '');

      setSeatPrices((current) => ({
        ...current,
        [grade]: digitsOnly,
      }));
    };

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

  const handleScheduleDateToggle = (dateKey: string) => {
    const scheduleDate = parseDateKey(dateKey);

    if (!scheduleDate) {
      return;
    }

    const isSelected = selectedScheduleDateKeys.includes(dateKey);

    const nextSelectedDateKeys = isSelected
      ? selectedScheduleDateKeys.filter((entryDateKey) => entryDateKey !== dateKey)
      : [...selectedScheduleDateKeys, dateKey].sort();

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

  const handlePerformanceOpenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const parsed = parseDateTimeLabel(nextValue);

    setPerformanceOpenInputValue(nextValue);

    if (!parsed) {
      return;
    }

    setPerformanceOpenAt(parsed);
    const nextPerformanceCloseAt =
      performanceCloseAt.getTime() < parsed.getTime() ? parsed : performanceCloseAt;

    if (performanceCloseAt.getTime() < parsed.getTime()) {
      setPerformanceCloseAt(parsed);
      setPerformanceCloseInputValue(formatDateTimeLabel(parsed));
    }

    syncSchedulesToPerformanceRange(parsed, nextPerformanceCloseAt);
  };

  const handlePerformanceCloseInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const parsed = parseDateTimeLabel(nextValue);

    setPerformanceCloseInputValue(nextValue);

    if (!parsed || parsed.getTime() < performanceOpenAt.getTime()) {
      return;
    }

    setPerformanceCloseAt(parsed);
    syncSchedulesToPerformanceRange(performanceOpenAt, parsed);
  };

  const handleHashtagAdd = (rawValue = hashtagInputValue) => {
    const normalizedValue = normalizeHashtag(rawValue);

    if (!normalizedValue || performanceHashtags.length >= maxPerformanceHashtagCount) {
      return;
    }

    const nextHashtag = `#${normalizedValue}`;

    if (performanceHashtags.includes(nextHashtag)) {
      setHashtagInputValue('');
      return;
    }

    setPerformanceHashtags((current) => [...current, nextHashtag]);
    setHashtagInputValue('');
  };

  const handleHashtagRemove = (targetHashtag: string) => {
    setPerformanceHashtags((current) => current.filter((hashtag) => hashtag !== targetHashtag));
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
    const addedDateKeys: string[] = [];

    targetDateKeys.forEach((dateKey) => {
      const currentTimes = nextSchedules[dateKey] ?? [];

      if (currentTimes.includes(timeValue)) {
        return;
      }

      nextSchedules[dateKey] = [...currentTimes, timeValue].sort();
      addedDateKeys.push(dateKey);
    });

    if (addedDateKeys.length === 0) {
      return;
    }

    setPerformanceSchedules(nextSchedules);
    setAddedScheduleNotice({
      timeValue,
      dateLabels: addedDateKeys
        .map((dateKey) => parseDateKey(dateKey))
        .filter((value): value is Date => value !== null)
        .map((value) => formatScheduleDateShortLabel(value)),
    });
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

  const goToPreviousRegistrationStep = () => {
    setActiveRegistrationStep((current) => Math.max(0, current - 1));
  };

  const goToNextRegistrationStep = () => {
    setActiveRegistrationStep((current) => Math.min(registrationStepItems.length - 1, current + 1));
  };

  const handleRegistrationSubmit = async () => {
    const normalizedPerformanceTitle = performanceTitle.trim();
    const resolvedSelectedCategoryId = Number(selectedCategoryId);

    setRegistrationErrorMessage(null);
    setRegistrationSuccessMessage(null);

    if (!normalizedPerformanceTitle) {
      setRegistrationErrorMessage('공연명을 입력해 주세요.');
      return;
    }

    if (registeredTicketSchedulePreviews.length === 0) {
      setRegistrationErrorMessage('등록할 회차를 먼저 추가해 주세요.');
      return;
    }

    if (hasInvalidTicketWindow) {
      setRegistrationErrorMessage('티켓 오픈일과 종료일 기준을 먼저 조정해 주세요.');
      return;
    }

    if (!Number.isInteger(resolvedSelectedCategoryId) || resolvedSelectedCategoryId <= 0) {
      setRegistrationErrorMessage('카테고리를 선택해 주세요.');
      return;
    }

    if (resolvedSelectedVenue === null) {
      setRegistrationErrorMessage('공연장을 선택해 주세요.');
      return;
    }

    if (!posterImage) {
      setRegistrationErrorMessage('포스터 이미지를 등록해 주세요.');
      return;
    }

    const seatGroups = (['VIP', 'R', 'S', 'A'] as const)
      .map((priceGrade) => {
        const seatIds = STAGE_4001_SEAT_IDS.flatMap((seatLabel) => {
          const assignment = seatPolicy[seatLabel];

          if (!assignment || assignment === 'disabled') {
            return [];
          }

          return seatPolicyGradeToApiGrade[assignment] === priceGrade
            ? [mockSeatIdByLabel.get(seatLabel) ?? -1]
            : [];
        }).filter((seatId) => seatId > 0);

        return {
          priceGrade,
          seatIds,
        };
      })
      .filter((seatGroup) => seatGroup.seatIds.length > 0);

    if (seatGroups.length === 0) {
      setRegistrationErrorMessage('등록 가능한 좌석이 없습니다. 좌석 정책을 다시 확인해 주세요.');
      return;
    }

    const usedPriceGrades = new Set(seatGroups.map((seatGroup) => seatGroup.priceGrade));
    const missingPriceField = seatGradeFields.find(
      ({ key }) =>
        usedPriceGrades.has(seatPriceGradeToApiGrade[key]) &&
        seatPrices[key].trim().length === 0,
    );

    if (missingPriceField) {
      setRegistrationErrorMessage(`${missingPriceField.label} 가격을 입력해 주세요.`);
      return;
    }

    const pricePolicies = seatGradeFields
      .filter(({ key }) => usedPriceGrades.has(seatPriceGradeToApiGrade[key]))
      .map(({ key }, index) => ({
        priceGrade: seatPriceGradeToApiGrade[key],
        priceAmount: Number(seatPrices[key]),
        discountInfo: [],
        currencyCode: 'KRW',
        displayOrder: index,
      }));

    const earliestTicketOpenAt = registeredTicketSchedulePreviews.reduce(
      (earliest, preview) =>
        preview.ticketOpenAt.getTime() < earliest.getTime() ? preview.ticketOpenAt : earliest,
      registeredTicketSchedulePreviews[0].ticketOpenAt,
    );
    const latestTicketCloseAt = registeredTicketSchedulePreviews.reduce(
      (latest, preview) =>
        preview.ticketCloseAt.getTime() > latest.getTime() ? preview.ticketCloseAt : latest,
      registeredTicketSchedulePreviews[0].ticketCloseAt,
    );

    setIsSubmittingRegistration(true);

    try {
      const request: AgencyRegistrationFlowRequest = {
        basicEvent: {
          venueId: resolvedSelectedVenue,
          categoryId: resolvedSelectedCategoryId,
          title: normalizedPerformanceTitle,
          eventStartAt: earliestTicketOpenAt.toISOString(),
          eventEndAt: latestTicketCloseAt.toISOString(),
          tags: performanceHashtags,
          notice: noticeText.trim(),
        },
        posterImage: posterImage.file,
        detailImages: introImages.map((image) => image.file),
        pricePolicies: {
          pricePolicies,
        },
        sessions: {
          sessions: registeredTicketSchedulePreviews.map((preview) => ({
            startAt: preview.scheduleAt.toISOString(),
            endAt: buildSessionEndAt(preview.scheduleAt, performanceCloseAt).toISOString(),
            salesOpenAt: preview.ticketOpenAt.toISOString(),
            salesCloseAt: preview.ticketCloseAt.toISOString(),
          })),
        },
        seats: {
          seats: seatGroups,
        },
      };

      const result = await submitAgencyEventRegistration(request);
      setRegistrationSuccessMessage(`공연 등록 API 호출이 완료되었습니다. eventId=${result.eventId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setRegistrationErrorMessage(error.message);
      } else if (error instanceof Error) {
        setRegistrationErrorMessage(error.message);
      } else {
        setRegistrationErrorMessage('공연 등록 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const hashtagSection = (
    <div className="flex min-h-[268px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-500">해시태그</span>
        <Badge color="blue" variant="outline">
          {performanceHashtags.length}/{maxPerformanceHashtagCount}
        </Badge>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.08em] text-slate-400">키워드 입력</span>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
            <span className="text-sm font-black text-blue-600">#</span>
            <input
              type="text"
              value={hashtagInputValue}
              onChange={(event) => setHashtagInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleHashtagAdd();
                }
              }}
              placeholder="초연, OST, 한정공연"
              disabled={performanceHashtags.length >= maxPerformanceHashtagCount}
              className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>
        </label>

        <Button
          color="primary"
          size="medium"
          disabled={!canAddHashtag}
          onClick={() => handleHashtagAdd()}
        >
          추가
        </Button>
      </div>

      {performanceHashtags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {performanceHashtags.map((hashtag) => (
            <button
              key={hashtag}
              type="button"
              onClick={() => handleHashtagRemove(hashtag)}
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
            >
              <span>{hashtag}</span>
              <span className="text-xs text-blue-400">삭제</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-400">
          아직 등록된 해시태그가 없습니다.
        </div>
      )}

      <p className="mt-3 text-xs font-medium text-slate-400">
        공백은 자동으로 제거되고, 같은 해시태그는 한 번만 등록됩니다.
      </p>
    </div>
  );

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-blue-600">공연 등록</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">공연 등록 대시보드</h1>
        </div>
      </header>

      <nav
        aria-label="공연 등록 단계"
        className="grid gap-3 lg:grid-cols-3 xl:mr-[360px]"
      >
        {registrationStepItems.map((step, index) => {
          const isActive = activeRegistrationStep === index;

          return (
            <button
              key={step.title}
              type="button"
              onClick={() => setActiveRegistrationStep(index)}
              className={`rounded-3xl border px-5 py-4 text-left transition ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-[0_14px_34px_rgba(49,130,246,0.14)]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-black ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                  STEP {index + 1}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-200'}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-base font-black text-slate-950">{step.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{step.sections}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">{step.detail}</p>
            </button>
          );
        })}
      </nav>

      <section className="grid gap-5 items-start xl:grid-cols-[minmax(0,1.6fr)_340px]">
        <div className="flex flex-col gap-5">
          <Box
            variant="shadow"
            className="space-y-5"
            style={{
              display: activeRegistrationStep === 0 ? undefined : 'none',
              order: activeRegistrationStep === 0 ? 2 : undefined,
            }}
          >
            <div>
              <h2 className="text-[18px] font-black text-slate-950">노출 콘텐츠</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                공연 포스터, 공연 소개 이미지, 공지사항을 등록해서 상세 노출 콘텐츠를 먼저 구성합니다.
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-500">공연 포스터</span>
                <input
                  ref={posterImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePosterImageInputChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openPosterImagePicker}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openPosterImagePicker();
                    }
                  }}
                  onDragEnter={handlePosterImageDragEnter}
                  onDragOver={handlePosterImageDragOver}
                  onDragLeave={handlePosterImageDragLeave}
                  onDrop={handlePosterImageDrop}
                  className={`rounded-3xl border border-dashed p-4 transition ${
                    isPosterImageDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
                  }`}
                >
                  {posterImage ? (
                    <div className="space-y-4">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100">
                        <Image
                          src={posterImage.previewUrl}
                          alt="공연 포스터 미리보기"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-700">{posterImage.file.name}</p>
                          <p className="mt-1 text-xs font-medium text-slate-400">
                            {formatFileSize(posterImage.file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePosterImageRemove();
                          }}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[420px] flex-col justify-between gap-4">
                      <div>
                        <p className="text-base font-black text-slate-950">포스터 이미지 업로드</p>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                          포스터 이미지를 드래그 앤 드랍하거나 클릭해서 파일 탐색기에서 선택합니다.
                          세로형 비율 이미지를 권장합니다.
                        </p>
                      </div>
                      <div className="inline-flex w-fit items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                        포스터 선택
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-400">{posterImageLabel}</span>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-500">공연 소개</span>
                  <input
                    ref={introImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleIntroImageInputChange}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openIntroImagePicker}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openIntroImagePicker();
                      }
                    }}
                    onDragEnter={handleIntroImageDragEnter}
                    onDragOver={handleIntroImageDragOver}
                    onDragLeave={handleIntroImageDragLeave}
                    onDrop={handleIntroImageDrop}
                    className={`min-h-[220px] rounded-3xl border border-dashed p-4 transition sm:p-5 ${
                      isIntroImageDragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between gap-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-base font-black text-slate-950">소개 이미지 업로드</p>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                            공연 소개 이미지를 여러 장 등록할 수 있습니다. 상세 페이지에 들어갈 소개용 이미지를 올립니다.
                          </p>
                        </div>
                        <div className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white sm:px-4 sm:py-2 sm:text-sm">
                          이미지 선택
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                          <span>{introImageCountLabel}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span>공연 소개 이미지는 여러 장 등록할 수 있습니다.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {introImages.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {introImages.map((image, index) => (
                        <div
                          key={image.id}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                        >
                          <div className="relative aspect-[4/3] bg-slate-100">
                            <Image
                              src={image.previewUrl}
                              alt={`공연 소개 이미지 ${index + 1}`}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-700">{image.file.name}</p>
                              <p className="mt-1 text-xs font-medium text-slate-400">{formatFileSize(image.file.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleIntroImageRemove(image.id);
                              }}
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-500">공지사항</span>
                  <textarea
                    value={noticeText}
                    onChange={(event) => setNoticeText(event.target.value)}
                    placeholder="예매 전 유의사항, 운영 공지, 입장 관련 안내를 입력합니다."
                    className="min-h-[180px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

              </div>
            </div>
          </Box>

          <Box
            variant="shadow"
            className="space-y-4"
            style={{
              display:
                activeRegistrationStep === 0 || activeRegistrationStep === 1
                  ? undefined
                  : 'none',
              order: activeRegistrationStep === 0 ? 1 : undefined,
            }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-3"
              style={{ display: activeRegistrationStep === 0 ? undefined : 'none' }}
            >
              <div>
                <h2 className="text-[18px] font-black text-slate-950">기본 정보</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  공연명, 공연장, 카테고리와 운영 기간을 입력합니다.
                </p>
              </div>
            </div>

            <div
              className="grid gap-5 md:grid-cols-2"
              style={{ display: activeRegistrationStep === 0 ? undefined : 'none' }}
            >
              <Input
                label="공연명"
                value={performanceTitle}
                onChange={(event) => setPerformanceTitle(event.target.value)}
                fullWidth
                className="[&_input]:text-[20px] [&_input]:tracking-[0.08em] sm:[&_input]:text-[22px]"
              />

              <div className="flex flex-col gap-1">
                <span className="mb-1 text-[13px] font-medium text-gray-500">공연장</span>
                <div className="relative" ref={venueDropdownRef}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between border-b-[2px] bg-transparent py-1 text-[20px] text-gray-900 outline-none transition-colors sm:text-[22px] ${
                      isVenueOpen ? 'border-blue-500' : 'border-gray-300'
                    }`}
                    disabled={isVenueListLoading || venueOptions.length === 0}
                    aria-expanded={isVenueOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsVenueOpen((current) => !current)}
                  >
                    <span className="truncate text-left">{selectedVenueInfo.label}</span>
                    <svg
                      className={`ml-3 h-5 w-5 shrink-0 transition-transform ${
                        isVenueOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.512a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {isVenueOpen ? (
                    <div
                      className="absolute left-0 top-full z-20 mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.12)]"
                      role="listbox"
                    >
                        <div className="max-h-72 overflow-y-auto p-2">
                        {venueOptions.map((venue) => {
                          const isSelected = venue.value === resolvedSelectedVenue;

                          return (
                            <button
                              key={venue.value}
                              type="button"
                              className={`w-full rounded-xl px-4 py-2.5 text-left transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setSelectedVenue(venue.value);
                                setIsVenueOpen(false);
                              }}
                            >
                              <p className="text-sm font-black">{venue.label}</p>
                              {venue.region || venue.capacity ? (
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                  {[venue.region, venue.capacity].filter(Boolean).join(' / ')}
                                </p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                <span className="text-xs font-medium text-slate-400">
                  DB에 등록된 공연장만 선택할 수 있습니다.
                </span>
              </div>

              <div className="md:col-span-2 grid gap-5 md:grid-cols-2">
                <div className="space-y-5">
                  <DateTimeTriggerField
                    label="공연 오픈일"
                    value={performanceOpenInputValue}
                    onChange={handlePerformanceOpenInputChange}
                    onBlur={() => setPerformanceOpenInputValue(formatDateTimeLabel(performanceOpenAt))}
                    onOpen={() => setIsPerformanceDateModalOpen(true)}
                  />

                  <div className="flex min-h-[268px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-500">카테고리</p>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                          공연 등록에 사용할 카테고리를 먼저 선택합니다.
                        </p>
                      </div>
                      <Badge color="blue" variant="outline">
                        {selectedCategoryInfo?.categoryName ?? (isCategoryListLoading ? '불러오는 중' : '미선택')}
                      </Badge>
                    </div>
                    <SegmentedControl
                      options={categoryOptions}
                      value={selectedCategoryId}
                      onChange={setSelectedCategoryId}
                      columns={Math.min(Math.max(categoryOptions.length, 1), 3)}
                      rows={Math.max(1, Math.ceil(categoryOptions.length / 3))}
                      size="large"
                      isLoading={isCategoryListLoading}
                      className="mt-2 flex-1"
                    />
                    {categoryListErrorMessage ? (
                      <p className="mt-3 text-sm font-medium text-red-500">{categoryListErrorMessage}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-5">
                  <DateTimeTriggerField
                    label="공연 종료일"
                    value={performanceCloseInputValue}
                    onChange={handlePerformanceCloseInputChange}
                    onBlur={() => setPerformanceCloseInputValue(formatDateTimeLabel(performanceCloseAt))}
                    onOpen={() => setIsPerformanceDateModalOpen(true)}
                  />

                  {hashtagSection}
                </div>
              </div>
            </div>

            <div
              className="space-y-5"
              style={{ display: activeRegistrationStep === 1 ? undefined : 'none' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[18px] font-black text-slate-950">티켓 일정 기준</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    등록된 각 회차 날짜와 공연 오픈/종료 시각을 기준으로 예매 오픈일과 종료일을 자동 계산합니다.
                  </p>
                </div>
              </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <TicketScheduleRuleField
                    label="티켓 오픈 기준"
                    description="각 회차의 공연일을 기준으로 며칠 전에 예매를 열지 설정합니다."
                    rule={ticketOpenRule}
                    onDaysChange={(days) =>
                      setTicketOpenRule((current) => ({ ...current, days }))
                    }
                  />

                  <TicketScheduleRuleField
                    label="티켓 종료 기준"
                    description="각 회차의 공연일을 기준으로 며칠 전에 예매를 닫을지 설정합니다."
                    rule={ticketCloseRule}
                    onDaysChange={(days) =>
                      setTicketCloseRule((current) => ({ ...current, days }))
                    }
                  />
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        {selectedScheduleDateKeys.length > 0 ? '선택한 회차 미리보기' : '등록 회차 미리보기'}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                        회차를 추가하면 아래에서 실제 예매 오픈일과 종료일이 어떻게 계산되는지 바로 확인할 수 있습니다.
                      </p>
                    </div>
                    <Badge color="grey" variant="outline">
                      {activeTicketSchedulePreviews.length}회차 기준
                    </Badge>
                  </div>

                  {ticketSchedulePreviewItems.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {ticketSchedulePreviewItems.map((preview) => (
                        <div
                          key={preview.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-950">
                                공연 {formatScheduleDateTimePreviewLabel(preview.scheduleAt)}
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-400">
                                회차 시간 {preview.timeValue}
                              </p>
                            </div>
                            <Badge color="blue" size="small">
                              {preview.dateKey}
                            </Badge>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
                              <p className="text-xs font-bold tracking-[0.08em] text-slate-400">티켓 오픈</p>
                              <p className="mt-2 text-sm font-black text-slate-950">
                                {formatDateTimeLabel(preview.ticketOpenAt)}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
                              <p className="text-xs font-bold tracking-[0.08em] text-slate-400">티켓 종료</p>
                              <p className="mt-2 text-sm font-black text-slate-950">
                                {formatDateTimeLabel(preview.ticketCloseAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {hiddenTicketSchedulePreviewCount > 0 ? (
                        <p className="text-sm font-medium text-slate-400">
                          나머지 {hiddenTicketSchedulePreviewCount}개 회차도 같은 기준으로 자동 계산됩니다.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium leading-6 text-slate-400">
                      아직 등록된 회차가 없습니다. 공연 일정 등록에서 회차를 추가하면 회차별 티켓 오픈일과 종료일이 자동 계산됩니다.
                    </div>
                  )}

                  {hasInvalidTicketWindow ? (
                    <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-600">
                      현재 기준에서는 일부 회차의 티켓 오픈일이 종료일보다 늦습니다. 오픈/종료 기준을 다시 조정해 주세요.
                    </div>
                  ) : null}

                  {hasTicketWindowAfterScheduleStart ? (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-700">
                      일부 회차는 현재 설정대로면 공연 시작 이후에도 예매가 열려 있습니다. 같은 날 종료를 쓰는 경우 공연 종료 시각을 확인해 주세요.
                    </div>
                  ) : null}
                </div>
              </div>
          </Box>

          <Box
            variant="shadow"
            className="space-y-5"
            style={{ display: activeRegistrationStep === 2 ? undefined : 'none' }}
          >
            <div>
              <h2 className="text-[18px] font-black text-slate-950">판매 정책</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                VIP / R / S / A 좌석별 금액을 직접 입력합니다.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-500">좌석 금액 설정</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {seatGradeFields.map((field) => (
                      <Input
                        key={field.key}
                        label={field.label}
                        fullWidth
                        inputMode="numeric"
                        value={formatSeatPriceInput(seatPrices[field.key])}
                        onChange={handleSeatPriceChange(field.key)}
                        placeholder="금액 입력"
                        className="[&_input]:text-[20px] [&_input]:tracking-[0.08em] sm:[&_input]:text-[22px]"
                      />
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold tracking-[0.08em] text-slate-400">가격 가이드</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                      상위 등급과 하위 등급 간 간격이 너무 크면 운영 검수에서 조정 요청이 들어올 수 있습니다.
                    </p>
                  </div>
                </div>

              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">좌석 금액 요약</p>

                <div className="mt-3 space-y-2.5">
                  {seatPriceSummary.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Badge color={field.badgeColor} size="small">
                          {field.label}
                        </Badge>
                        <span className="text-sm font-black text-slate-950">
                          ₩{field.formattedValue}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                        {field.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Box>

          <Box
            variant="shadow"
            className="space-y-5"
            style={{ display: activeRegistrationStep === 2 ? undefined : 'none' }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[18px] font-black text-slate-950">좌석 등급/비활성 설정</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  좌석도에서 어떤 좌석을 VIP, R, S, A로 운영할지와 판매 제외 좌석을 직접 지정합니다.
                </p>
              </div>
              <Button
                color="primary"
                variant="weak"
                size="medium"
                onClick={() => setIsSeatPolicyModalOpen(true)}
              >
                좌석 등급 설정 열기
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-3xl border border-red-100 bg-red-50/70 p-5">
                <div className="flex items-center">
                  <Badge color="red" size="small">VIP</Badge>
                </div>
                <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
                  {seatPolicySummary.vip}
                  <span className="ml-1 text-lg font-bold text-slate-500">석</span>
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">프리미엄 운영 좌석</p>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
                <div className="flex items-center">
                  <Badge color="blue" size="small">R석</Badge>
                </div>
                <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
                  {seatPolicySummary.r}
                  <span className="ml-1 text-lg font-bold text-slate-500">석</span>
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">무대 중심 시야 좌석</p>
              </div>

              <div className="rounded-3xl border border-green-100 bg-green-50/70 p-5">
                <div className="flex items-center">
                  <Badge color="green" size="small">S석</Badge>
                </div>
                <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
                  {seatPolicySummary.s}
                  <span className="ml-1 text-lg font-bold text-slate-500">석</span>
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">일반 판매 핵심 좌석</p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center">
                  <Badge color="grey" size="small">A석</Badge>
                </div>
                <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
                  {seatPolicySummary.a}
                  <span className="ml-1 text-lg font-bold text-slate-500">석</span>
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">입문형 가격대 좌석</p>
              </div>

              <div className="rounded-3xl border border-slate-300 bg-white p-5">
                <div className="flex items-center">
                  <Badge color="grey" variant="outline" size="small">비활성</Badge>
                </div>
                <p className="mt-4 whitespace-nowrap text-[28px] font-black tracking-tight text-slate-950">
                  {seatPolicySummary.disabled}
                  <span className="ml-1 text-lg font-bold text-slate-500">석</span>
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">예매에서 제외되는 좌석</p>
              </div>
            </div>
          </Box>

          <Box
            variant="shadow"
            className="space-y-5"
            style={{ display: activeRegistrationStep === 1 ? undefined : 'none' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-black text-slate-950">공연 일정 등록</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  공연 오픈일과 종료일을 기준으로 날짜가 자동 생성됩니다. 날짜를 고른 뒤 회차 시간을 빠르게 추가하세요.
                </p>
              </div>
              <Badge color="blue" variant="outline">
                총 {registeredPerformanceCount}회차 등록
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-500">운영 날짜</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      {formatDateKey(performanceOpenAt)} ~ {formatDateKey(performanceCloseAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    날짜 카드를 눌러 여러 날짜를 선택한 뒤 같은 회차를 한 번에 추가할 수 있습니다.
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    총 {performanceScheduleDateKeys.length}일 범위에서 회차를 등록합니다.
                  </p>

                  <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {performanceScheduleDateKeys.map((dateKey) => {
                      const scheduleDate = parseDateKey(dateKey);

                      if (!scheduleDate) {
                        return null;
                      }

                      const isSelected = selectedScheduleDateKeys.includes(dateKey);
                      const scheduleCount = performanceSchedules[dateKey]?.length ?? 0;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => handleScheduleDateToggle(dateKey)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isSelected ? 'bg-blue-500' : 'bg-slate-200'
                                }`}
                              />
                              <p className="text-sm font-black text-slate-950">
                                {formatScheduleDateShortLabel(scheduleDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                                {scheduleCount}회
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-medium text-slate-400">{dateKey}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <p className="text-sm font-bold text-slate-500">선택 날짜</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {selectedScheduleDateCount > 1
                        ? `${selectedScheduleDateCount}일 선택`
                        : selectedDateLabel}
                    </p>
                  </div>

                  <p className="mt-4 text-sm font-medium leading-6 text-slate-600">
                    {selectedScheduleDateCount > 0
                      ? `입력한 시간은 현재 선택한 ${selectedScheduleDateCount}일에 한 번에 추가됩니다.`
                      : '운영 날짜에서 날짜를 선택하면 입력한 시간을 여러 날짜에 한 번에 추가할 수 있습니다.'}
                  </p>

                  {selectedScheduleDateLabels.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedScheduleDateLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-black/5"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-400">
                      아직 선택된 날짜가 없습니다.
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="text-sm font-bold text-slate-500">시간 입력</span>
                      <input
                        type="time"
                        step={600}
                        value={scheduleTimeInputValue}
                        onChange={(event) => setScheduleTimeInputValue(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                    <Button
                      color="primary"
                      size="medium"
                      disabled={selectedScheduleDateCount === 0}
                      onClick={() => handleScheduleTimeAdd()}
                    >
                      선택 날짜에 회차 추가
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-bold text-slate-500">등록 상태</p>
                <p className="mt-3 text-[28px] font-black tracking-tight text-slate-950">
                  {selectedScheduleTimes.length}
                  <span className="ml-1 text-lg font-bold text-slate-500">회차</span>
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  {selectedScheduleDateCount > 0
                    ? `${selectedVenueInfo?.label}에서 ${selectedDateLabel} 기준 회차를 확인하고, 선택된 ${selectedScheduleDateCount}일에 일괄 추가합니다.`
                    : `${selectedVenueInfo?.label}에서 날짜를 선택하면 해당 날짜 기준 회차를 확인할 수 있습니다.`}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-500">등록된 공연 시간</p>
                    <p className="mt-1 text-sm font-medium text-slate-400">
                      같은 날짜에 등록된 회차를 바로 확인하고 삭제할 수 있습니다.
                    </p>
                  </div>
                  {selectedScheduleTimes.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleSelectedScheduleClear}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                    >
                      선택 날짜 초기화
                    </button>
                  ) : null}
                </div>

                {selectedScheduleTimes.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedScheduleTimes.map((timeValue) => (
                      <div
                        key={timeValue}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <span className="text-base font-black text-slate-950">{timeValue}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedScheduleDateKey) {
                              handleScheduleTimeRemove(selectedScheduleDateKey, timeValue);
                            }
                          }}
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-black/5 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500">
                    아직 등록된 회차가 없습니다. 시간을 입력해서 추가하세요.
                  </div>
                )}
              </div>
            </div>
          </Box>
        </div>

        <div className="space-y-5 xl:fixed xl:right-8 xl:top-6 xl:z-20 xl:max-h-[calc(100vh-3rem)] xl:w-[340px] xl:overflow-y-auto xl:pr-1">
          <Box variant="outline" className="space-y-4">
            <div>
              <h2 className="text-[18px] font-black text-slate-950">진행 단계</h2>
            </div>

            <div className="space-y-3">
              {registrationStepItems.map((item, index) => {
                const isActive = activeRegistrationStep === index;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActiveRegistrationStep(index)}
                    className={`flex w-full gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      isActive ? 'bg-blue-50' : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-black text-slate-800">{item.title}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                        {item.sections}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Box>

          <Box variant="outline" className="space-y-4">
            <div>
              <h2 className="text-[18px] font-black text-slate-950">다음 액션</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                현재 단계는 {activeRegistrationStep + 1}단계입니다.
              </p>
            </div>

            {isLastRegistrationStep ? (
              <>
                <Button
                  color="primary"
                  display="block"
                  size="medium"
                  onClick={handleRegistrationSubmit}
                  isLoading={isSubmittingRegistration}
                  disabled={!canSubmitRegistration}
                >
                  공연 등록 신청하기
                </Button>
                <Button
                  color="primary"
                  variant="weak"
                  display="block"
                  size="medium"
                  disabled={isSubmittingRegistration}
                >
                  미리보기
                </Button>
              </>
            ) : (
              <Button color="primary" display="block" size="medium" onClick={goToNextRegistrationStep}>
                다음 단계
              </Button>
            )}

            {isFirstRegistrationStep ? null : (
              <Button
                color="dark"
                variant="weak"
                display="block"
                size="medium"
                onClick={goToPreviousRegistrationStep}
              >
                이전 단계
              </Button>
            )}

            {registrationErrorMessage ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-600">
                {registrationErrorMessage}
              </div>
            ) : null}

            {registrationSuccessMessage ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700">
                {registrationSuccessMessage}
              </div>
            ) : null}
          </Box>
        </div>
      </section>

      {isSeatPolicyModalOpen ? (
        <AgencySeatPolicyModal
          isOpen={isSeatPolicyModalOpen}
          onClose={() => setIsSeatPolicyModalOpen(false)}
          seatPolicy={seatPolicy}
          onConfirm={setSeatPolicy}
        />
      ) : null}

      {isPerformanceDateModalOpen ? (
        <DateRangeModal
          isOpen={isPerformanceDateModalOpen}
          title="공연 일정 설정"
          description="공연 시작일과 종료일을 한 번에 확인하면서 날짜와 시간을 함께 설정합니다."
          startLabel="공연 시작일"
          endLabel="공연 종료일"
          initialStartAt={performanceOpenAt}
          initialEndAt={performanceCloseAt}
          onClose={() => setIsPerformanceDateModalOpen(false)}
          onConfirm={(nextStartAt, nextEndAt) => {
            setPerformanceOpenAt(nextStartAt);
            setPerformanceCloseAt(nextEndAt);
            setPerformanceOpenInputValue(formatDateTimeLabel(nextStartAt));
            setPerformanceCloseInputValue(formatDateTimeLabel(nextEndAt));
            syncSchedulesToPerformanceRange(nextStartAt, nextEndAt);
            setIsPerformanceDateModalOpen(false);
          }}
        />
      ) : null}

      {addedScheduleNotice ? (
        <PerformanceScheduleAddedModal
          isOpen={Boolean(addedScheduleNotice)}
          onClose={() => setAddedScheduleNotice(null)}
          addedTime={addedScheduleNotice.timeValue}
          addedDateLabels={addedScheduleNotice.dateLabels}
        />
      ) : null}
    </div>
  );
}
