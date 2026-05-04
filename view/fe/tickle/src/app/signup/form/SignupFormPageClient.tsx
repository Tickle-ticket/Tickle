'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { authApi } from '@/src/shared/api/authApi';
import { setTokens } from '@/src/shared/api/tokenManager';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { Modal } from '@/src/shared/components/Modal';
import { UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { signupAccountTypeCopy, type SignupAccountType } from '../signupAccountType';
import { useAgencies, type AgencyOption } from './useAgencies';

interface SignupFormPageClientProps {
  initialAccountType: SignupAccountType;
}

type ErrorState = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  organization: string;
  phone: string;
  verificationCode: string;
};

interface AgencyDropdownFieldProps {
  agencies: AgencyOption[];
  isLoading: boolean;
  isError: boolean;
  selectedAgencyId: string;
  onSelect: (agencyId: string) => void;
  error?: string;
}

const STEP_LABELS = ['계정 정보', '기본 정보', '휴대폰 인증', '약관 동의'] as const;

const TERM_MODAL_CONTENT = {
  terms1: {
    title: '서비스 이용약관 및 개인정보 수집 동의',
    description:
      '티클 서비스 이용을 위해 필요한 기본 약관입니다.\n\n회원 식별, 예매 처리, 고객 문의 대응을 위한 범위에서 개인정보를 수집하고 이용합니다.',
  },
  terms2: {
    title: '공연 소식 및 운영 공지 수신 동의',
    description:
      '신규 공연 오픈, 예매 일정 변경, 서비스 공지 메일을 수신합니다.\n\n선택 동의이며, 가입 후 마이페이지에서 언제든 변경할 수 있습니다.',
  },
} as const;

const createEmptyErrors = (): ErrorState => ({
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  organization: '',
  phone: '',
  verificationCode: '',
});

function AgencyDropdownField({
  agencies,
  isLoading,
  isError,
  selectedAgencyId,
  onSelect,
  error,
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
    ? '기획사 목록을 불러오는 중입니다.'
    : isError
      ? '기획사 목록을 불러오지 못했습니다.'
      : '기획사를 선택해 주세요.';

  return (
    <div className="flex w-full flex-col gap-1">
      <span className="mb-1 text-[13px] font-medium text-gray-500">기획사명</span>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`flex w-full items-center justify-between border-b-[2px] bg-transparent py-2 text-[16px] text-gray-900 outline-none transition-colors disabled:cursor-not-allowed disabled:text-gray-400 ${
            isOpen ? 'border-blue-500' : error ? 'border-red-500' : 'border-gray-300'
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
            className={`ml-3 h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}
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
      {error ? <span className="mt-1 text-[12px] text-red-500">{error}</span> : null}
      <span className="text-xs font-medium text-slate-400">등록된 기획사만 선택할 수 있습니다.</span>
    </div>
  );
}

export function SignupFormPageClient({ initialAccountType }: SignupFormPageClientProps) {
  const router = useRouter();
  const selectedTypeCopy = signupAccountTypeCopy[initialAccountType];
  const isAgencySignup = initialAccountType === 'agency';
  const { data: agencies = [], isLoading: isAgenciesLoading, isError: isAgenciesError } = useAgencies(isAgencySignup);

  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [agencies, selectedAgencyId]
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    password: '',
    passwordConfirm: '',
  });
  const [errors, setErrors] = useState<ErrorState>(createEmptyErrors);
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);
  const [receiveAnnouncements, setReceiveAnnouncements] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [openModalType, setOpenModalType] = useState<keyof typeof TERM_MODAL_CONTENT | null>(null);

  const totalSteps = STEP_LABELS.length;
  const activeModal = openModalType ? TERM_MODAL_CONTENT[openModalType] : null;

  const clearFieldError = (field: keyof ErrorState) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const handleAgencySelect = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    clearFieldError('organization');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name in createEmptyErrors()) {
      clearFieldError(name as keyof ErrorState);
    }

    if (name === 'phone') {
      setIsCodeSent(false);
      setIsPhoneVerified(false);
      setVerificationCode('');
    }
  };

  const validateStep = (step: number) => {
    const nextErrors = createEmptyErrors();
    let hasError = false;

    if (step === 1) {
      if (!formData.email) {
        nextErrors.email = '이메일을 입력해 주세요.';
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        nextErrors.email = '올바른 이메일 형식을 입력해 주세요.';
        hasError = true;
      }

      if (!formData.password) {
        nextErrors.password = '비밀번호를 입력해 주세요.';
        hasError = true;
      } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,20}$/.test(formData.password)) {
        nextErrors.password = '영문, 숫자, 특수문자를 포함해 8자 이상 20자 이하로 입력해 주세요.';
        hasError = true;
      }

      if (!formData.passwordConfirm) {
        nextErrors.passwordConfirm = '비밀번호 확인을 입력해 주세요.';
        hasError = true;
      } else if (formData.password !== formData.passwordConfirm) {
        nextErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
        hasError = true;
      }
    }

    if (step === 2) {
      if (!formData.name) {
        nextErrors.name = isAgencySignup ? '담당자명을 입력해 주세요.' : '이름을 입력해 주세요.';
        hasError = true;
      } else if (!/^[A-Za-z가-힣\s]{2,20}$/.test(formData.name)) {
        nextErrors.name = '이름은 한글 또는 영문 2자 이상 20자 이하로 입력해 주세요.';
        hasError = true;
      }

      if (isAgencySignup) {
        if (!selectedAgencyId) {
          nextErrors.organization = '기획사를 선택해 주세요.';
          hasError = true;
        }
      } else if (!formData.organization) {
        nextErrors.organization = `${selectedTypeCopy.organizationLabel}을 입력해 주세요.`;
        hasError = true;
      }
    }

    if (step === 3 && !isPhoneVerified) {
      nextErrors.phone = '휴대폰 인증을 완료해 주세요.';
      hasError = true;
    }

    setErrors(nextErrors);
    return !hasError;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSendCode = async () => {
    if (!/^010\d{8}$/.test(formData.phone)) {
      setErrors((prev) => ({ ...prev, phone: '휴대폰 번호를 올바르게 입력해 주세요. 예: 01012345678' }));
      return;
    }

    setErrors((prev) => ({ ...prev, phone: '', verificationCode: '' }));
    setIsSendingCode(true);

    const mockSms = true;

    if (mockSms) {
      window.setTimeout(() => {
        setIsCodeSent(true);
        setIsSendingCode(false);
      }, 500);
      return;
    }

    try {
      await authApi.sendPhoneCode({ phoneNumber: formData.phone });
      setIsCodeSent(true);
    } catch (error) {
      console.error('sendPhoneCode failed', error);
      setErrors((prev) => ({ ...prev, phone: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' }));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setErrors((prev) => ({ ...prev, verificationCode: '인증번호를 입력해 주세요.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, verificationCode: '' }));
    setIsVerifyingCode(true);

    const mockSms = true;

    if (mockSms) {
      window.setTimeout(() => {
        setIsPhoneVerified(true);
        setIsVerifyingCode(false);
      }, 500);
      return;
    }

    try {
      await authApi.verifyPhoneCode({ phoneNumber: formData.phone, code: verificationCode });
      setIsPhoneVerified(true);
    } catch (error) {
      console.error('verifyPhoneCode failed', error);
      setErrors((prev) => ({ ...prev, verificationCode: '인증번호가 일치하지 않거나 만료되었습니다.' }));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const isSignupDisabled =
    (isAgencySignup && !selectedAgencyId) ||
    !isPhoneVerified ||
    isSubmitting ||
    !isTermsAgreed;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const stepOneValid = validateStep(1);
    const stepTwoValid = validateStep(2);
    const stepThreeValid = validateStep(3);

    if (!stepOneValid || !stepTwoValid || !stepThreeValid || !isTermsAgreed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.signup({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phoneNumber: formData.phone,
        role: isAgencySignup ? 'ORGANIZER' : 'USER',
        organizerName: isAgencySignup ? selectedAgency?.name : formData.organization,
      });

      if (response.data) {
        setTokens(response.data.accessToken, response.data.refreshToken);
        router.push('/');
      }
    } catch (error) {
      console.error('Signup failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <UserAuthFrame
        activeTab="signup"
        size="wide"
        label={isAgencySignup ? '기획사 회원가입' : '관객 회원가입'}
        title={isAgencySignup ? '운영에 사용할 계정을 설정해 주세요' : '예매에 사용할 계정을 설정해 주세요'}
      >
        <div className="mb-6 grid grid-cols-4 gap-2">
          {STEP_LABELS.map((stepLabel, index) => {
            const stepNo = index + 1;
            const isActive = currentStep === stepNo;
            const isCompleted = currentStep > stepNo;

            return (
              <div key={stepLabel} className="space-y-2">
                <div className={`h-1.5 rounded-full ${isCompleted || isActive ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <p className={`text-xs font-bold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{stepLabel}</p>
              </div>
            );
          })}
        </div>

        <p className="mb-6 text-sm leading-6 text-slate-500">{selectedTypeCopy.cardDescription}</p>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <input type="hidden" name="accountType" value={initialAccountType} />
          {isAgencySignup ? (
            <>
              <input type="hidden" name="agencyId" value={selectedAgencyId} />
              <input type="hidden" name="organization" value={selectedAgency?.name ?? ''} />
            </>
          ) : null}

          <div className="min-h-[280px]">
            {currentStep === 1 ? (
              <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                <Input
                  label="이메일"
                  type="email"
                  name="email"
                  placeholder="이메일을 입력해 주세요."
                  autoComplete="email"
                  fullWidth
                  required
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  style={{ letterSpacing: '-0.02em' }}
                  className="[&_input]:text-[20px]"
                />
                <Input
                  label="비밀번호"
                  type="password"
                  name="password"
                  placeholder="8자 이상 입력해 주세요."
                  autoComplete="new-password"
                  fullWidth
                  required
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  style={{ letterSpacing: '-0.02em' }}
                  className="[&_input]:text-[20px]"
                />
                <Input
                  label="비밀번호 확인"
                  type="password"
                  name="passwordConfirm"
                  placeholder="비밀번호를 다시 입력해 주세요."
                  autoComplete="new-password"
                  fullWidth
                  required
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  error={errors.passwordConfirm}
                  style={{ letterSpacing: '-0.02em' }}
                  className="[&_input]:text-[20px]"
                />
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                <Input
                  label={isAgencySignup ? '담당자명' : '이름'}
                  name="name"
                  placeholder={isAgencySignup ? '담당자명을 입력해 주세요.' : '이름을 입력해 주세요.'}
                  autoComplete="name"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  style={{ letterSpacing: '-0.02em' }}
                  className="[&_input]:text-[20px]"
                />

                {isAgencySignup ? (
                  <AgencyDropdownField
                    agencies={agencies}
                    isLoading={isAgenciesLoading}
                    isError={isAgenciesError}
                    selectedAgencyId={selectedAgencyId}
                    onSelect={handleAgencySelect}
                    error={errors.organization}
                  />
                ) : (
                  <Input
                    label={selectedTypeCopy.organizationLabel}
                    name="organization"
                    placeholder={selectedTypeCopy.organizationPlaceholder}
                    autoComplete="organization"
                    fullWidth
                    value={formData.organization}
                    onChange={handleChange}
                    error={errors.organization}
                    style={{ letterSpacing: '-0.02em' }}
                    className="[&_input]:text-[20px]"
                  />
                )}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="휴대폰"
                      type="tel"
                      name="phone"
                      placeholder="01012345678"
                      autoComplete="tel"
                      fullWidth
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={isPhoneVerified}
                      error={errors.phone}
                      style={{ letterSpacing: '-0.02em' }}
                      className="[&_input]:text-[20px]"
                    />
                  </div>
                  <Button
                    type="button"
                    size="large"
                    className="mb-[2px] h-[43px] px-4 whitespace-nowrap"
                    onClick={handleSendCode}
                    disabled={isPhoneVerified || isSendingCode || !formData.phone}
                    isLoading={isSendingCode}
                  >
                    {isPhoneVerified ? '인증완료' : isCodeSent ? '재전송' : '인증번호 받기'}
                  </Button>
                </div>

                {isCodeSent && !isPhoneVerified ? (
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Input
                        label="인증번호"
                        type="text"
                        name="verificationCode"
                        placeholder="6자리 숫자"
                        fullWidth
                        value={verificationCode}
                        onChange={(event) => {
                          setVerificationCode(event.target.value);
                          clearFieldError('verificationCode');
                        }}
                        error={errors.verificationCode}
                        style={{ letterSpacing: '-0.02em' }}
                        className="[&_input]:text-[20px]"
                      />
                    </div>
                    <Button
                      type="button"
                      size="large"
                      className="mb-[2px] h-[43px] px-4 whitespace-nowrap"
                      onClick={handleVerifyCode}
                      disabled={isVerifyingCode || !verificationCode}
                      isLoading={isVerifyingCode}
                    >
                      확인
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                <Box variant="gray" className="rounded-[24px] bg-slate-50">
                  <p className="text-sm font-black text-slate-900">입력 정보 확인</p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="font-medium text-slate-500">계정 유형</dt>
                      <dd className="font-bold text-slate-900">{selectedTypeCopy.label}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="font-medium text-slate-500">이메일</dt>
                      <dd className="font-bold text-slate-900">{formData.email}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="font-medium text-slate-500">{isAgencySignup ? '담당자명' : '이름'}</dt>
                      <dd className="font-bold text-slate-900">{formData.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="font-medium text-slate-500">{selectedTypeCopy.organizationLabel}</dt>
                      <dd className="font-bold text-slate-900">
                        {isAgencySignup ? selectedAgency?.name ?? '-' : formData.organization || '-'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="font-medium text-slate-500">휴대폰</dt>
                      <dd className="font-bold text-slate-900">{formData.phone}</dd>
                    </div>
                  </dl>
                </Box>

                <Box variant="gray" className="rounded-[24px] bg-slate-50">
                  <p className="text-sm font-black text-slate-900">약관 동의</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    회원가입을 완료하려면 필수 약관에 동의해 주세요.
                  </p>

                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-[18px] border border-white bg-white px-4 py-3">
                      <label className="inline-flex flex-1 cursor-pointer items-center gap-3 pr-2 text-sm font-medium text-slate-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={isTermsAgreed}
                          onChange={(event) => setIsTermsAgreed(event.target.checked)}
                        />
                        <span className="leading-tight">서비스 이용약관 및 개인정보 수집·이용에 동의합니다.</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenModalType('terms1')}
                        className="ml-2 shrink-0 text-xs font-bold text-blue-500 underline transition-colors hover:text-blue-700"
                      >
                        약관 보기
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-[18px] border border-white bg-white px-4 py-3">
                      <label className="inline-flex flex-1 cursor-pointer items-center gap-3 pr-2 text-sm font-medium text-slate-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={receiveAnnouncements}
                          onChange={(event) => setReceiveAnnouncements(event.target.checked)}
                        />
                        <span className="leading-tight">공연 소식 및 운영 공지 메일을 수신합니다.</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenModalType('terms2')}
                        className="ml-2 shrink-0 text-xs font-bold text-blue-500 underline transition-colors hover:text-blue-700"
                      >
                        약관 보기
                      </button>
                    </div>
                  </div>
                </Box>
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 pt-4">
            {currentStep > 1 ? (
              <div className="flex-1">
                <Button type="button" variant="weak" color="dark" display="block" size="xlarge" onClick={handlePrev}>
                  이전
                </Button>
              </div>
            ) : null}

            <div className="flex-1">
              {currentStep < totalSteps ? (
                <Button type="button" display="block" size="xlarge" color="dark" onClick={handleNext}>
                  다음
                </Button>
              ) : (
                <Button type="submit" display="block" size="xlarge" disabled={isSignupDisabled} isLoading={isSubmitting}>
                  회원가입 완료
                </Button>
              )}
            </div>
          </div>
        </form>
      </UserAuthFrame>

      <Modal
        isOpen={activeModal !== null}
        onClose={() => setOpenModalType(null)}
        onConfirm={() => setOpenModalType(null)}
        title={activeModal?.title}
        description={activeModal?.description}
        confirmText="닫기"
        showCancelButton={false}
      />
    </>
  );
}

export default SignupFormPageClient;
