'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { signupAccountTypeCopy, type SignupAccountType } from '../signupAccountType';
import { useAgencies, type AgencyOption } from './useAgencies';

interface SignupFormPageClientProps {
  initialAccountType: SignupAccountType;
}

interface AgencyDropdownFieldProps {
  agencies: AgencyOption[];
  isLoading: boolean;
  isError: boolean;
  selectedAgencyId: string;
  onSelect: (agencyId: string) => void;
}

function AgencyDropdownField({
  agencies,
  isLoading,
  isError,
  selectedAgencyId,
  onSelect,
}: AgencyDropdownFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [agencies, selectedAgencyId]
  );
  const isDisabled = isLoading || isError || agencies.length === 0;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const placeholderText = isLoading
    ? '기획사 목록을 불러오는 중입니다'
    : isError
      ? '기획사 목록을 불러오지 못했습니다'
      : '기획사를 선택하세요';

  return (
    <div className="flex w-full flex-col gap-1">
      <span className="mb-1 text-[13px] font-medium text-gray-500">기획사명</span>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`flex w-full items-center justify-between border-b-[2px] bg-transparent py-1 text-[24px] text-gray-900 outline-none transition-colors disabled:cursor-not-allowed disabled:text-gray-400 ${
            isOpen ? 'border-blue-500' : 'border-gray-300'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={isDisabled}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className={`truncate text-left ${selectedAgency ? '' : 'text-gray-300'}`}>
            {selectedAgency?.name ?? placeholderText}
          </span>
          <svg
            className={`ml-3 h-5 w-5 shrink-0 transition-transform ${
              isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'
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

        {isOpen ? (
          <div
            className="absolute left-0 top-full z-20 mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.12)]"
            role="listbox"
          >
            <div className="max-h-72 overflow-y-auto p-2">
              {agencies.map((agency) => {
                const isSelected = agency.id === selectedAgencyId;

                return (
                  <button
                    key={agency.id}
                    type="button"
                    className={`w-full rounded-xl px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(agency.id);
                      setIsOpen(false);
                    }}
                  >
                    <p className="text-sm font-black">{agency.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <span className="text-xs font-medium text-slate-400">등록된 기획사만 선택할 수 있습니다.</span>
    </div>
  );
}

export function SignupFormPageClient({ initialAccountType }: SignupFormPageClientProps) {
  const selectedTypeCopy = signupAccountTypeCopy[initialAccountType];
  const isAgencySignup = initialAccountType === 'agency';
  const { data: agencies = [], isLoading: isAgenciesLoading, isError: isAgenciesError } = useAgencies(isAgencySignup);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [agencies, selectedAgencyId]
  );
  const isSignupDisabled = isAgencySignup && selectedAgencyId.length === 0;

  return (
    <UserAuthFrame
      activeTab="signup"
      size="wide"
    >
      <form className="space-y-6">
        <input type="hidden" name="accountType" value={initialAccountType} />
        {isAgencySignup ? (
          <>
            <input type="hidden" name="agencyId" value={selectedAgencyId} />
            <input type="hidden" name="organization" value={selectedAgency?.name ?? ''} />
          </>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          {isAgencySignup ? (
            <AgencyDropdownField
              agencies={agencies}
              isLoading={isAgenciesLoading}
              isError={isAgenciesError}
              selectedAgencyId={selectedAgencyId}
              onSelect={setSelectedAgencyId}
            />
          ) : null}
          <Input
            label={isAgencySignup ? '담당자명' : '이름'}
            name="name"
            placeholder={isAgencySignup ? '담당자명을 입력하세요' : '이름을 입력하세요'}
            autoComplete="name"
            fullWidth
            required
            style={{ letterSpacing: 0 }}
          />
          <Input
            label="아이디"
            type="email"
            name="email"
            placeholder="you@tickle.kr"
            autoComplete="email"
            fullWidth
            required
            style={{ letterSpacing: 0 }}
          />
          <Input
            label="휴대전화"
            type="tel"
            name="phone"
            placeholder="01012345678"
            autoComplete="tel"
            fullWidth
            required
            style={{ letterSpacing: 0 }}
          />
          {!isAgencySignup ? (
            <Input
              label={selectedTypeCopy.organizationLabel}
              name="organization"
              placeholder={selectedTypeCopy.organizationPlaceholder}
              autoComplete="organization"
              fullWidth
              required
              style={{ letterSpacing: 0 }}
            />
          ) : null}
          <Input
            label="비밀번호"
            type="password"
            name="password"
            placeholder="8자 이상 입력하세요"
            autoComplete="new-password"
            fullWidth
            required
            style={{ letterSpacing: 0 }}
          />
          <Input
            label="비밀번호 확인"
            type="password"
            name="passwordConfirm"
            placeholder="비밀번호를 다시 입력하세요"
            autoComplete="new-password"
            fullWidth
            required
            style={{ letterSpacing: 0 }}
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
          <Button type="submit" display="block" size="xlarge" color="dark" disabled={isSignupDisabled}>
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

export default SignupFormPageClient;
