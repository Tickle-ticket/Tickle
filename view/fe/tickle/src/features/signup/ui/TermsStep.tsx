'use client';

import type { SignupAccountTypeCopy } from '@/src/app/signup/signupAccountType';

import { Box } from '@/src/shared/components/Box';
import type { Dispatch, SetStateAction } from 'react';
import type { AgencyOption } from '@/src/app/signup/form/useAgencies';
import type { SignupFormData } from '@/src/features/signup/model/signupTypes';
import { TERM_MODAL_CONTENT } from '@/src/features/signup/model/signupTypes';

/**
 * 약관 동의와 입력 내용 확인 단계입니다.
 */
export const TermsStep = ({
  formData,
  isAgencySignup,
  isTermsAgreed,
  receiveAnnouncements,
  selectedAgency,
  selectedTypeCopy,
  setIsTermsAgreed,
  setOpenModalType,
  setReceiveAnnouncements,
}: {
  formData: SignupFormData;
  isAgencySignup: boolean;
  isTermsAgreed: boolean;
  receiveAnnouncements: boolean;
  selectedAgency: AgencyOption | undefined;
  selectedTypeCopy: SignupAccountTypeCopy;
  setIsTermsAgreed: Dispatch<SetStateAction<boolean>>;
  setOpenModalType: Dispatch<SetStateAction<keyof typeof TERM_MODAL_CONTENT | null>>;
  setReceiveAnnouncements: Dispatch<SetStateAction<boolean>>;
}) => (
  <div className="space-y-5 animate-in fade-in duration-300">
    <Box variant="gray" className="rounded-[24px] bg-surface-subtle">
      <p className="text-sm font-black text-content">입력 정보 확인</p>
      <dl className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-content-tertiary">계정 유형</dt>
          <dd className="font-bold text-content">{selectedTypeCopy.label}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-content-tertiary">이메일</dt>
          <dd className="font-bold text-content">{formData.email}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-content-tertiary">{isAgencySignup ? '담당자명' : '이름'}</dt>
          <dd className="font-bold text-content">{formData.name}</dd>
        </div>
        {!isAgencySignup ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-content-tertiary">닉네임</dt>
              <dd className="font-bold text-content">{formData.nickname}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-content-tertiary">생년월일</dt>
              <dd className="font-bold text-content">{formData.birthDate}</dd>
            </div>
          </>
        ) : null}
        {isAgencySignup ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-content-tertiary">기획사명</dt>
            <dd className="font-bold text-content">{selectedAgency?.name ?? '-'}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-content-tertiary">휴대폰번호</dt>
          <dd className="font-bold text-content">{formData.phone}</dd>
        </div>
      </dl>
    </Box>

    <Box variant="gray" className="rounded-[24px] bg-surface-subtle">
      <p className="text-sm font-black text-content">약관 동의</p>
      <p className="mt-1 text-sm font-medium leading-6 text-content-tertiary">
        회원가입을 완료하려면 필수 약관에 동의해 주세요.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-[18px] border border-white bg-surface px-4 py-3">
          <label className="inline-flex flex-1 cursor-pointer items-center gap-3 pr-2 text-sm font-medium text-content-secondary">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 rounded border-line-strong text-primary focus:ring-primary"
              checked={isTermsAgreed}
              onChange={(event) => setIsTermsAgreed(event.target.checked)}
            />
            <span className="leading-tight">서비스 이용약관 및 개인정보 수집에 동의합니다.</span>
          </label>
          <button
            type="button"
            onClick={() => setOpenModalType('terms1')}
            className="ml-2 shrink-0 text-xs font-bold text-primary underline transition-colors hover:text-primary-hover"
          >
            약관 보기
          </button>
        </div>

        <div className="flex items-center justify-between rounded-[18px] border border-white bg-surface px-4 py-3">
          <label className="inline-flex flex-1 cursor-pointer items-center gap-3 pr-2 text-sm font-medium text-content-secondary">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 rounded border-line-strong text-primary focus:ring-primary"
              checked={receiveAnnouncements}
              onChange={(event) => setReceiveAnnouncements(event.target.checked)}
            />
            <span className="leading-tight">공연 소식 및 운영 공지 메일을 수신합니다.</span>
          </label>
          <button
            type="button"
            onClick={() => setOpenModalType('terms2')}
            className="ml-2 shrink-0 text-xs font-bold text-primary underline transition-colors hover:text-primary-hover"
          >
            약관 보기
          </button>
        </div>
      </div>
    </Box>
  </div>
);
