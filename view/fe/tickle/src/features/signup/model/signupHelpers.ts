import {
  ERROR_FIELDS,
  NAME_PATTERN,
  NICKNAME_PATTERN,
  type ErrorField,
  type ErrorState,
} from './signupTypes';

/**
 * 회원가입 입력값을 다듬고 검사하는 순수 함수들입니다.
 *
 * <p>화면 상태와 무관해서 그대로 옮길 수 있었습니다.</p>
 */

export const createEmptyErrors = (): ErrorState => ({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  nickname: '',
  birthDate: '',
  organization: '',
  phone: '',
  verificationCode: '',
  submit: '',
});

export const countCharacters = (value: string) => Array.from(value.trim()).length;

export const isErrorField = (value: string): value is ErrorField => ERROR_FIELDS.includes(value as ErrorField);

export const sanitizeInputValue = (name: string, value: string) => {
  switch (name) {
    case 'name':
      return value.replace(/\s+/g, '').slice(0, 12);
    case 'nickname':
      return value.replace(/\s+/g, '').slice(0, 20);
    case 'phone':
      return value.replace(/\D/g, '').slice(0, 11);
    case 'verificationCode':
      return value.replace(/\D/g, '').slice(0, 6);
    case 'birthDate':
      return value.replace(/\D/g, '').slice(0, 8);
    default:
      return value;
  }
};

export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const convertBirthDateToApiFormat = (yyyyMMdd: string) => {
  if (yyyyMMdd.length !== 8) return '';
  const yyyy = yyyyMMdd.slice(0, 4);
  const mm = yyyyMMdd.slice(4, 6);
  const dd = yyyyMMdd.slice(6, 8);
  return `${yyyy}-${mm}-${dd}`;
};

export const isValidBirthDate = (value: string) => {
  if (!/^\d{8}$/.test(value)) {
    return false;
  }

  const apiFormat = convertBirthDateToApiFormat(value);
  const [year, month, day] = apiFormat.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  return apiFormat <= getTodayDate();
};

export const getNameError = (value: string, isAgencySignup: boolean) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return isAgencySignup ? '담당자명을 입력해 주세요.' : '이름을 입력해 주세요.';
  }

  if (countCharacters(trimmedValue) > 12) {
    return '이름은 12자 이하로 입력해 주세요.';
  }

  if (!NAME_PATTERN.test(trimmedValue)) {
    return '이름에는 한글과 영문만 사용할 수 있습니다.';
  }

  return '';
};

export const getNicknameError = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '닉네임을 입력해 주세요.';
  }

  if (countCharacters(trimmedValue) > 20) {
    return '닉네임은 20자 이하로 입력해 주세요.';
  }

  if (!NICKNAME_PATTERN.test(trimmedValue)) {
    return '닉네임에는 한글, 영문, 숫자만 사용할 수 있습니다.';
  }

  return '';
};
