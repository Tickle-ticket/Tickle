import type { AgencyOption } from '@/src/app/signup/form/useAgencies';

/**
 * 회원가입 폼에서 쓰는 타입과 상수입니다.
 *
 * <p>가입 페이지 한 파일에 타입·검증·필드·단계별 화면이 모두 있어 933줄이었습니다.
 * 그중 값이 고정된 것들을 여기로 옮깁니다.</p>
 */

export type ErrorState = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  nickname: string;
  birthDate: string;
  organization: string;
  phone: string;
  verificationCode: string;
  submit: string;
};

export type ErrorField = keyof ErrorState;

/**
 * 서버 에러코드를 입력 필드에 대응시킨다 (services/auth AuthErrorCode).
 *
 * 이 표에 없는 실패는 어느 칸을 고쳐야 할지 알 수 없으므로 폼 하단(submit)에
 * 그대로 남긴다. status만으로는 나눌 수 없다 — 409 하나에 이메일 중복과 전화번호
 * 중복이 함께 들어와 두 경우 모두 폼 하단에 뜨고 있었다.
 */
export const SIGNUP_ERROR_FIELD_BY_CODE: Record<string, ErrorField> = {
  DUPLICATE_EMAIL: 'email',
  DUPLICATE_PHONE: 'phone',
  PHONE_NOT_VERIFIED: 'phone',
  PHONE_VERIFICATION_FAILED: 'verificationCode',
  NICKNAME_REQUIRED: 'nickname',
  ORGANIZER_NAME_REQUIRED: 'organization',
};

export interface AgencyDropdownFieldProps {
  agencies: AgencyOption[];
  isLoading: boolean;
  isError: boolean;
  selectedAgencyId: string;
  onSelect: (agencyId: string) => void;
  error?: string;
}

export const STEP_LABELS = ['계정 정보', '기본 정보', '휴대폰 인증', '약관 동의'] as const;

export const TERM_MODAL_CONTENT = {
  terms1: {
    title: '서비스 이용약관 및 개인정보 수집 동의',
    description:
      '티클 서비스 이용을 위해 필요한 기본 약관입니다.\n\n회원 식별, 예매 처리, 고객 문의 응대를 위한 범위에서 개인정보를 수집하고 이용합니다.',
  },
  terms2: {
    title: '공연 소식 및 운영 공지 수신 동의',
    description:
      '신규 공연 오픈, 예매 일정 변경, 서비스 공지 메일을 수신합니다.\n\n선택 동의이며, 가입 후 마이페이지에서 언제든 변경할 수 있습니다.',
  },
} as const;

export const AGENCY_APPROVAL_MODAL_CONTENT = {
  title: '관리자 승인 필요',
  description:
    '기획사 회원가입은 관리자 승인 후 이용할 수 있습니다.\n\n승인이 완료되기 전에는 기획사 계정 가입을 진행할 수 없습니다.',
} as const;

export const ERROR_FIELDS: readonly ErrorField[] = [
  'email',
  'password',
  'passwordConfirm',
  'name',
  'nickname',
  'birthDate',
  'organization',
  'phone',
  'verificationCode',
  'submit',
];

export const NAME_PATTERN = /^[A-Za-z가-힣]+$/;
export const NICKNAME_PATTERN = /^[A-Za-z가-힣0-9]+$/;
export const SPECIAL_CHARACTER_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

/** 회원가입 입력값. */
export type SignupFormData = {
  name: string;
  nickname: string;
  birthDate: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
};
