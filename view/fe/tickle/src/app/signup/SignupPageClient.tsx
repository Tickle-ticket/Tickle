'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { SegmentedControl } from '@/src/shared/components/SegmentedControl';
import { UserAuthFrame } from '@/src/shared/components/UserAuthFrame';

type SignupAccountType = 'audience' | 'agency';

const accountTypeOptions = [
  { label: '관람객', value: 'audience' },
  { label: '기획사', value: 'agency' },
];

const accountTypeCopy: Record<
  SignupAccountType,
  {
    badgeColor: 'blue' | 'green';
    badgeText: string;
    cardTitle: string;
    cardDescription: string;
    pageDescription: string;
    organizationLabel: string;
    organizationPlaceholder: string;
  }
> = {
  audience: {
    badgeColor: 'blue',
    badgeText: '관람객',
    cardTitle: '관람객 계정',
    cardDescription: '홈, 검색, 예매 시작 화면으로 바로 이어지는 개인용 계정입니다.',
    pageDescription: '관람객용 계정 정보를 입력하고 홈, 검색, 예매 흐름으로 자연스럽게 이어집니다.',
    organizationLabel: '닉네임',
    organizationPlaceholder: '닉네임을 입력하세요',
  },
  agency: {
    badgeColor: 'green',
    badgeText: '기획사',
    cardTitle: '기획사 계정',
    cardDescription: '공연 등록, 일정 설정, 운영 점검 페이지로 연결되는 작업용 계정입니다.',
    pageDescription: '기획사 운영에 필요한 기본 정보를 입력하고 공연 등록 워크스페이스로 이어집니다.',
    organizationLabel: '기획사명',
    organizationPlaceholder: '기획사명을 입력하세요',
  },
};

export function SignupPageClient() {
  const [selectedType, setSelectedType] = useState<SignupAccountType>('audience');
  const selectedTypeCopy = accountTypeCopy[selectedType];

  return (
    <UserAuthFrame
      activeTab="signup"
      label="회원가입"
      title="계정 유형을 선택하고 바로 가입하세요"
      description={selectedTypeCopy.pageDescription}
      size="wide"
      footer={
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-slate-500">이미 계정이 있나요?</span>
          <Link href="/login" className="font-bold text-blue-600 transition hover:text-blue-700">
            로그인
          </Link>
        </div>
      }
    >
      <form className="space-y-6">
        <input type="hidden" name="accountType" value={selectedType} />

        <Box variant="gray" className="rounded-[24px] bg-slate-50">
          <p className="text-sm font-black text-slate-900">가입 유형</p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            아래에서 한 가지 유형만 선택할 수 있습니다.
          </p>

          <SegmentedControl
            options={accountTypeOptions}
            value={selectedType}
            onChange={(value) => setSelectedType(value as SignupAccountType)}
            columns={2}
            size="large"
            className="mt-4"
          />

          <div className="mt-4 rounded-[22px] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-black text-slate-950">{selectedTypeCopy.cardTitle}</p>
              <Badge size="small" color={selectedTypeCopy.badgeColor}>
                {selectedTypeCopy.badgeText}
              </Badge>
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{selectedTypeCopy.cardDescription}</p>
          </div>
        </Box>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="이름"
            name="name"
            placeholder="이름을 입력하세요"
            autoComplete="name"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
          />
          <Input
            label="이메일"
            type="email"
            name="email"
            placeholder="you@tickle.kr"
            autoComplete="email"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
          />
          <Input
            label="휴대전화"
            type="tel"
            name="phone"
            placeholder="01012345678"
            autoComplete="tel"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
          />
          <Input
            label={selectedTypeCopy.organizationLabel}
            name="organization"
            placeholder={selectedTypeCopy.organizationPlaceholder}
            autoComplete="organization"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
          />
          <Input
            label="비밀번호"
            type="password"
            name="password"
            placeholder="8자 이상 입력하세요"
            autoComplete="new-password"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
          />
          <Input
            label="비밀번호 확인"
            type="password"
            name="passwordConfirm"
            placeholder="비밀번호를 다시 입력하세요"
            autoComplete="new-password"
            fullWidth
            required
            style={{ letterSpacing: '-0.02em' }}
          />
        </div>

        <Box variant="gray" className="rounded-[24px] bg-slate-50">
          <p className="text-sm font-black text-slate-900">약관 및 운영 안내</p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            운영 페이지 진입 가능 여부와 알림 수신 동의는 가입 후에도 변경할 수 있습니다.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="inline-flex items-start gap-3 rounded-[18px] border border-white bg-white px-4 py-3 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                required
              />
              서비스 이용약관과 개인정보 수집 및 이용에 동의합니다.
            </label>
            <label className="inline-flex items-start gap-3 rounded-[18px] border border-white bg-white px-4 py-3 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              공연 오픈 알림과 운영 공지 메일을 수신합니다.
            </label>
          </div>
        </Box>

        <div className="grid gap-3">
          <Button type="submit" display="block" size="xlarge">
            회원가입
          </Button>
          <Button as="a" href="/login" color="dark" variant="weak" display="block" size="xlarge">
            로그인으로 이동
          </Button>
        </div>
      </form>
    </UserAuthFrame>
  );
}

export default SignupPageClient;
