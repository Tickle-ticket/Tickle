import type { AgencySeatPolicy } from '@/src/shared/components/AgencySeatPolicyModal';
import type { AgencySeatGrade } from '@/src/shared/api/types/agency.types';

/**
 * 기획사 공연 등록 화면에서 쓰는 타입 모음입니다.
 *
 * <p>등록 페이지 한 파일에 타입·헬퍼·모달·본문이 모두 있어 3,792줄이었습니다.
 * 그중 타입 정의를 여기로 옮깁니다.</p>
 */

export type VenueOption = {
  value: number;
  label: string;
  region?: string;
  capacity?: string;
};

export type RegistrationErrorTarget =
  | 'poster'
  | 'performanceTitle'
  | 'performanceDate'
  | 'venue'
  | 'category'
  | 'ticketRule'
  | 'schedule'
  | 'seatPolicy'
  | 'seatPrice'
  | 'discount';

export type RegistrationValidationResult = {
  message: string;
  target: RegistrationErrorTarget;
  stepIndex: number;
};

export type SeatGradeKey = 'vip' | 'r' | 's' | 'a';

export type SupportedAgencySeatGrade = Exclude<AgencySeatGrade, 'B' | 'RESTRICTED_VIEW'>;

export type VenueTemplateSeatState = {
  seatPolicy: AgencySeatPolicy | null;
  seatIdByLabel: Map<string, number>;
};

export type ScheduleTimePeriod = 'am' | 'pm';

export type IntroImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

export type PerformanceScheduleMap = Record<string, string[]>;

export type TicketScheduleRule = {
  days: string;
};

export type TicketSchedulePreview = {
  id: string;
  dateKey: string;
  timeValue: string;
  scheduleAt: Date;
  sessionEndAt: Date;
  ticketOpenAt: Date;
  ticketCloseAt: Date;
};

export type SeatDiscountDraft = {
  id: string;
  preset: 'youth' | 'disability' | 'patriot' | 'custom';
  customDiscountName: string;
  discountRate: string;
};
