export type SignupAccountType = 'audience' | 'agency';

export interface SignupAccountTypeCopy {
  value: SignupAccountType;
  label: string;
  badgeColor: 'blue' | 'green';
  cardTitle: string;
  cardDescription: string;
  organizationLabel: string;
  organizationPlaceholder: string;
}

export const signupAccountTypes: SignupAccountTypeCopy[] = [
  {
    value: 'audience',
    label: '일반 회원',
    badgeColor: 'blue',
    cardTitle: '일반 회원 계정',
    cardDescription: '공연을 찾고 예매하는 개인용 계정입니다.',
    organizationLabel: '소속',
    organizationPlaceholder: '소속을 입력해 주세요.',
  },
  {
    value: 'agency',
    label: '기획사',
    badgeColor: 'green',
    cardTitle: '기획사 계정',
    cardDescription: '공연 등록과 운영, 정산을 관리하는 운영자 계정입니다.',
    organizationLabel: '기획사명',
    organizationPlaceholder: '기획사명을 입력해 주세요.',
  },
];

export const signupAccountTypeCopy: Record<SignupAccountType, SignupAccountTypeCopy> =
  signupAccountTypes.reduce(
    (acc, accountType) => {
      acc[accountType.value] = accountType;
      return acc;
    },
    {} as Record<SignupAccountType, SignupAccountTypeCopy>
  );

export function isSignupAccountType(value: string | undefined): value is SignupAccountType {
  return value === 'audience' || value === 'agency';
}

export function getSignupFormHref(accountType: SignupAccountType) {
  return `/signup/form?type=${accountType}`;
}
