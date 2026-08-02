import {
  type AgencySeatPolicy,
  type AgencySeatAssignmentMode,
} from '@/src/shared/components/AgencySeatPolicyModal';
import type { AgencyVenueTemplate } from '@/src/shared/api/types/agency.types';
import { STAGE_4001_SEAT_IDS } from '@/src/shared/components/Stage_4001';
import type {
  IntroImageItem,
  RegistrationErrorTarget,
  ScheduleTimePeriod,
  SeatDiscountDraft,
  SeatGradeKey,
  SupportedAgencySeatGrade,
  TicketScheduleRule,
  VenueOption,
  VenueTemplateSeatState,
} from './registrationTypes';

/**
 * 기획사 공연 등록 화면의 순수 계산 함수와 상수입니다.
 *
 * <p>날짜 포맷·좌석 등급 매핑·할인 프리셋처럼 화면 상태와 무관한 것들이라
 * 등록 페이지에서 분리했습니다. React에 의존하지 않아 그대로 옮길 수 있습니다.</p>
 */

export const DEFAULT_SESSION_DURATION_MINUTES = 60;

export const registrationStepItems = [
  {
    title: '노출/기본 정보',
    sections: '노출 콘텐츠, 기본 정보',
    detail: '카테고리를 포함한 기본 정보를 먼저 입력합니다.',
  },
  {
    title: '티켓/공연 일정',
    sections: '공연 일정 등록, 티켓 일정 기준',
    detail: '예매 오픈/종료 기준과 회차 일정을 설정합니다.',
  },
  {
    title: '판매/좌석 설정',
    sections: '판매 정책, 좌석 등급/비활성 설정',
    detail: '좌석 금액과 좌석 운영 정책을 마무리합니다.',
  },
];

export const maxPerformanceHashtagCount = 3;

export const basicInfoErrorTargets = new Set<RegistrationErrorTarget>([
  'performanceTitle',
  'performanceDate',
  'venue',
  'category',
]);

export const seatGradeFields: Array<{
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

export const seatPriceGradeToApiGrade: Record<SeatGradeKey, SupportedAgencySeatGrade> = {
  vip: 'VIP',
  r: 'R',
  s: 'S',
  a: 'A',
};

export const seatPolicyGradeToApiGrade: Record<
  Exclude<AgencySeatAssignmentMode, 'disabled'>,
  SupportedAgencySeatGrade
> = {
  VIP: 'VIP',
  R: 'R',
  S: 'S',
  A: 'A',
};

export const stageSeatIdSet = new Set(STAGE_4001_SEAT_IDS);

export const fallbackVenueOption: VenueOption = {
  value: 0,
  label: '공연장 선택',
};

export const normalizeTemplateSeatLabel = (seatLabel: string) => seatLabel.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

export const resolveTemplateSeatStageId = (seatLabel: string, rowLabel: string, seatNumber: string) => {
  const normalizedSeatLabel = normalizeTemplateSeatLabel(seatLabel);

  if (normalizedSeatLabel.length > 0) {
    return normalizedSeatLabel;
  }

  return normalizeTemplateSeatLabel(`${rowLabel}${seatNumber}`);
};

export const createDisabledSeatPolicy = (): AgencySeatPolicy =>
  Object.fromEntries(STAGE_4001_SEAT_IDS.map((seatId) => [seatId, 'disabled']));

export const buildSeatTemplateState = (template: AgencyVenueTemplate): VenueTemplateSeatState => {
  const nextSeatPolicy = createDisabledSeatPolicy();
  const seatIdByLabel = new Map<string, number>();
  let assignedSeatCount = 0;

  template.sections.forEach((section) => {
    section.seats.forEach((seat) => {
      const stageSeatId = resolveTemplateSeatStageId(seat.seatLabel, seat.rowLabel, seat.seatNumber);

      if (!stageSeatIdSet.has(stageSeatId)) {
        return;
      }

      const assignment =
        seat.seatGrade === 'VIP' || seat.seatGrade === 'R' || seat.seatGrade === 'S' || seat.seatGrade === 'A'
          ? seat.seatGrade
          : 'disabled';

      nextSeatPolicy[stageSeatId] = assignment;
      seatIdByLabel.set(stageSeatId, seat.venueSeatId);
      assignedSeatCount += 1;
    });
  });

  return {
    seatPolicy: assignedSeatCount > 0 ? nextSeatPolicy : null,
    seatIdByLabel,
  };
};

export const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (value: string) => {
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

export const formatDateTimeLabel = (value: Date) => {
  const dateLabel = formatDateKey(value);
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${dateLabel} ${hours}:${minutes}`;
};

export const parseDateTimeLabel = (value: string) => {
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

export const formatTimeValue = (value: Date) => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getScheduleTimePeriod = (timeValue: string): ScheduleTimePeriod => {
  const hours = Number(timeValue.slice(0, 2));
  return Number.isFinite(hours) && hours < 12 ? 'am' : 'pm';
};

export const scheduleTimeQuickOptions = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
});

export const scheduleTimeQuickOptionsByPeriod: Record<ScheduleTimePeriod, string[]> = {
  am: scheduleTimeQuickOptions.slice(0, 24),
  pm: scheduleTimeQuickOptions.slice(24),
};

export const scheduleWeekdayOptions = [
  { label: '월', weekday: 1 },
  { label: '화', weekday: 2 },
  { label: '수', weekday: 3 },
  { label: '목', weekday: 4 },
  { label: '금', weekday: 5 },
  { label: '토', weekday: 6 },
  { label: '일', weekday: 0 },
];

export const buildEnabledDateRange = (startDate: Date, totalDays: number) => {
  const dates: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  for (let index = 0; index < totalDays; index += 1) {
    const nextDate = new Date(cursor);
    nextDate.setDate(cursor.getDate() + index);
    dates.push(formatDateKey(nextDate));
  }

  return dates;
};

export const withSelectedDate = (selectedDate: Date, sourceDate: Date) => {
  const nextDate = new Date(sourceDate);
  nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  return nextDate;
};

export const withSelectedTime = (sourceDate: Date, timeValue: string) => {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const nextDate = new Date(sourceDate);

  if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
    nextDate.setHours(hours, minutes, 0, 0);
  }

  return nextDate;
};

export const ensureDateRangeOrder = (startAt: Date, endAt: Date) =>
  endAt.getTime() < startAt.getTime() ? new Date(startAt) : endAt;

export const discountPresetOptions = [
  { label: '청소년', value: 'youth' },
  { label: '장애인', value: 'disability' },
  { label: '국가유공자', value: 'patriot' },
  { label: '직접입력', value: 'custom' },
] as const;

export const discountPresetNameMap: Record<'youth' | 'disability' | 'patriot', string> = {
  youth: '청소년',
  disability: '장애인',
  patriot: '국가유공자',
};

export const createSeatDiscountDraft = (): SeatDiscountDraft => ({
  id:
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  preset: 'youth',
  customDiscountName: '',
  discountRate: '',
});

export const createIntroImageKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

export const normalizeHashtag = (value: string) => value.trim().replace(/^#+/, '').replace(/\s+/g, '');

export const parseOffsetDayValue = (value: string) => {
  const digits = value.replace(/[^\d]/g, '');
  return digits;
};

export const withTimeFromDate = (sourceDate: Date, timeSourceDate: Date) => {
  const nextDate = new Date(sourceDate);
  nextDate.setHours(timeSourceDate.getHours(), timeSourceDate.getMinutes(), 0, 0);
  return nextDate;
};

export const buildTicketScheduleDate = (referenceAt: Date, rule: TicketScheduleRule) => {
  const nextDate = new Date(referenceAt);
  nextDate.setDate(nextDate.getDate() - Number(rule.days || 0));
  return nextDate;
};

export const buildSessionEndAt = (scheduleAt: Date, fallbackEndTimeSource: Date) => {
  const nextEndAt = withTimeFromDate(scheduleAt, fallbackEndTimeSource);

  if (nextEndAt.getTime() > scheduleAt.getTime()) {
    return nextEndAt;
  }

  const fallbackEndAt = new Date(scheduleAt);
  fallbackEndAt.setMinutes(fallbackEndAt.getMinutes() + DEFAULT_SESSION_DURATION_MINUTES);
  return fallbackEndAt;
};

export const createDefaultPerformanceStartAt = () => {
  const nextStartAt = new Date();
  nextStartAt.setDate(nextStartAt.getDate() + 1);
  nextStartAt.setHours(19, 30, 0, 0);
  return nextStartAt;
};

export const createDefaultPerformanceEndAt = (startAt: Date) => {
  const nextEndAt = new Date(startAt);
  nextEndAt.setDate(nextEndAt.getDate() + 30);
  nextEndAt.setHours(18, 0, 0, 0);
  return nextEndAt;
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) {
    return `${new Intl.NumberFormat('ko-KR').format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  }

  const megaBytes = bytes / (1024 * 1024);
  return `${megaBytes >= 10 ? megaBytes.toFixed(0) : megaBytes.toFixed(1)} MB`;
};

export const buildDateKeysBetween = (startAt: Date, endAt: Date) => {
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

export const formatScheduleDateShortLabel = (value: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(value);

export const formatScheduleDateTimePreviewLabel = (value: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);

export const isValidScheduleTime = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

export const createImagePreviewItem = (file: File): IntroImageItem => ({
  id: createIntroImageKey(file),
  file,
  previewUrl: URL.createObjectURL(file),
});
