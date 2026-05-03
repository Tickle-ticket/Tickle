'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/src/shared/components/Badge';
import { Box } from '@/src/shared/components/Box';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { Modal } from '@/src/shared/components/Modal';
import { UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { authApi } from '@/src/shared/api/authApi';
import { setTokens } from '@/src/shared/api/tokenManager';
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
          className={`flex w-full items-center justify-between border-b-[2px] bg-transparent py-2 text-[16px] text-gray-900 outline-none transition-colors disabled:cursor-not-allowed disabled:text-gray-400 ${isOpen ? 'border-blue-500' : 'border-gray-300'
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
            className={`ml-3 h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'
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
                    className={`w-full rounded-xl px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
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
      <span className="text-xs font-medium text-slate-400 mt-1">등록된 기획사만 선택할 수 있습니다.</span>
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
  
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    password: '',
    passwordConfirm: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    organization: '',
    phone: '',
    verificationCode: ''
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    let hasError = false;
    const newErrors = { ...errors };

    if (currentStep === 1) {
      if (!formData.email) { newErrors.email = '이메일을 입력해주세요.'; hasError = true; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { newErrors.email = '유효한 이메일 주소를 입력하세요.'; hasError = true; }
      
      if (!formData.password) {
        newErrors.password = '비밀번호를 입력해주세요.';
        hasError = true;
      } else if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,20}$/.test(formData.password)) {
        newErrors.password = '영문, 숫자, 특수문자 포함 8~20자로 입력해주세요.';
        hasError = true;
      }

      if (!formData.passwordConfirm) { newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.'; hasError = true; }
      
      if (formData.password && formData.passwordConfirm && formData.password !== formData.passwordConfirm) {
        newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
        hasError = true;
      }
    } else if (currentStep === 2) {
      if (!formData.name) {
        newErrors.name = '이름을 입력해주세요.';
        hasError = true;
      } else if (!/^[가-힣a-zA-Z]{2,20}$/.test(formData.name)) {
        newErrors.name = '한글 또는 영문 2~20자로 입력해주세요 (특수문자/숫자 제외).';
        hasError = true;
      }
      
      if (isAgencySignup && !selectedAgencyId) { newErrors.organization = '기획사를 선택해주세요.'; hasError = true; }
      if (!isAgencySignup && !formData.organization) { newErrors.organization = '닉네임을 입력해주세요.'; hasError = true; }
    } else if (currentStep === 3) {
      if (!isPhoneVerified) {
        newErrors.phone = '휴대폰 인증을 완료해주세요.';
        hasError = true;
      }
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const [openModalType, setOpenModalType] = useState<'terms1' | 'terms2' | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSendCode = async () => {
    if (!/^010\d{8}$/.test(formData.phone)) {
      setErrors((prev) => ({ ...prev, phone: '휴대폰 번호를 올바르게 입력해주세요. (010xxxxxxxx)' }));
      return;
    }
    
    setIsSendingCode(true);

    const MOCK_SMS = true;
    
    if (MOCK_SMS) {
      setTimeout(() => {
        setIsCodeSent(true);
        setIsSendingCode(false);
      }, 500);
      return;
    }

    try {
      await authApi.sendPhoneCode({ phoneNumber: formData.phone });
      setIsCodeSent(true);
      // alert('인증번호가 발송되었습니다. 5분 내에 입력해주세요.'); // 테스트를 위해 성공 alert도 임시 제거 가능 (요청시)
    } catch (error: any) {
      console.error('sendPhoneCode failed', error);
      setErrors((prev) => ({ ...prev, phone: error?.response?.data?.message || '인증번호 발송에 실패했습니다.' }));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setErrors((prev) => ({ ...prev, verificationCode: '인증번호를 입력해주세요.' }));
      return;
    }
    
    setIsVerifyingCode(true);

    const MOCK_SMS = true;

    if (MOCK_SMS) {
      setTimeout(() => {
        setIsPhoneVerified(true);
        setIsVerifyingCode(false);
      }, 500);
      return;
    }

    try {
      await authApi.verifyPhoneCode({ phoneNumber: formData.phone, code: verificationCode });
      setIsPhoneVerified(true);
      alert('휴대폰 인증이 완료되었습니다.');
    } catch (error: any) {
      console.error('verifyPhoneCode failed', error);
      setErrors((prev) => ({ ...prev, verificationCode: error?.response?.data?.message || '인증번호가 일치하지 않거나 만료되었습니다.' }));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const isSignupDisabled = (isAgencySignup && selectedAgencyId.length === 0) || !isPhoneVerified || isSubmitting || !isTermsAgreed;
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    let hasError = false;
    const newErrors = { ...errors };

    if (isAgencySignup && !selectedAgencyId) {
      alert('기획사를 선택해주세요.'); // Keep as alert for agency dropdown if no error prop is supported, or map to organization
      hasError = true;
    }
    
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
      hasError = true;
    }
    
    if (!isPhoneVerified) {
      newErrors.phone = '휴대폰 인증을 완료해주세요.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const role = initialAccountType === 'agency' ? 'ORGANIZER' : 'USER';
      const request = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phoneNumber: formData.phone,
        role: role as 'ORGANIZER' | 'USER',
        organizerName: isAgencySignup ? selectedAgency?.name : formData.organization,
      };
      
      const response = await authApi.signup(request);
      if (response.data) {
        setTokens(response.data.accessToken, response.data.refreshToken);
        alert('회원가입이 완료되었습니다!');
        router.push('/');
      }
    } catch (error: any) {
      console.error('Signup failed', error);
      // alert(error?.response?.data?.message || '회원가입에 실패했습니다.');
      router.push('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserAuthFrame
      activeTab="signup"
      size="narrow"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <input type="hidden" name="accountType" value={initialAccountType} />
        {isAgencySignup ? (
          <>
            <input type="hidden" name="agencyId" value={selectedAgencyId} />
            <input type="hidden" name="organization" value={selectedAgency?.name ?? ''} />
          </>
        ) : null}

        <Box variant="gray" className="rounded-[24px] bg-slate-50 border border-black/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-black text-slate-900">가입 유형</p>
                <Badge size="small" color={selectedTypeCopy.badgeColor}>
                  {selectedTypeCopy.label}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm font-medium leading-6 text-slate-500">
                {selectedTypeCopy.cardDescription}
              </p>
            </div>
            <Link
              href="/signup"
              className="shrink-0 text-[13px] font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              유형 변경
            </Link>
          </div>
        </Box>

        {/* Step Indicator */}
        <div className="mb-8 mt-2">
          <div className="flex justify-between mb-2 px-2 sm:px-6">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex flex-col items-center flex-1 ${
                  currentStep >= step ? 'text-blue-600' : 'text-slate-300'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-colors ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step}
                </div>
                <span className="text-[11px] font-bold hidden sm:block">
                  {step === 1 ? '계정 정보' : step === 2 ? '인적 사항' : step === 3 ? '본인 인증' : '약관 동의'}
                </span>
              </div>
            ))}
          </div>
          <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden mx-6 sm:mx-14">
            <div
              className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300 ease-in-out"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="min-h-[260px]">
          {currentStep === 1 && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
              <Input
                label="아이디"
                type="email"
                name="email"
                placeholder="이메일을 입력하세요"
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
                placeholder="8자 이상 입력하세요"
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
                placeholder="비밀번호를 다시 입력하세요"
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
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
              <Input
                label={isAgencySignup ? '담당자명' : '이름'}
                name="name"
                placeholder={isAgencySignup ? '담당자명을 입력하세요' : '이름을 입력하세요'}
                autoComplete="name"
                fullWidth
                required
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                style={{ letterSpacing: '-0.02em' }}
                className="[&_input]:text-[20px]"
              />
              {!isAgencySignup ? (
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
              ) : (
                <AgencyDropdownField
                  agencies={agencies}
                  isLoading={isAgenciesLoading}
                  isError={isAgenciesError}
                  selectedAgencyId={selectedAgencyId}
                  onSelect={setSelectedAgencyId}
                />
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="휴대전화"
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
                  className="h-[43px] px-4 whitespace-nowrap mb-[2px]"
                  onClick={handleSendCode}
                  disabled={isPhoneVerified || isSendingCode || !formData.phone}
                  isLoading={isSendingCode}
                >
                  {isPhoneVerified ? '인증완료' : isCodeSent ? '재전송' : '인증번호 받기'}
                </Button>
              </div>
              
              {isCodeSent && !isPhoneVerified && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="인증번호"
                      type="text"
                      name="verificationCode"
                      placeholder="6자리 숫자"
                      fullWidth
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value);
                        if (errors.verificationCode) setErrors(prev => ({ ...prev, verificationCode: '' }));
                      }}
                      error={errors.verificationCode}
                      style={{ letterSpacing: '-0.02em' }}
                      className="[&_input]:text-[20px]"
                    />
                  </div>
                  <Button 
                    type="button" 
                    size="large"
                    className="h-[43px] px-4 whitespace-nowrap mb-[2px]"
                    onClick={handleVerifyCode}
                    disabled={isVerifyingCode || !verificationCode}
                    isLoading={isVerifyingCode}
                  >
                    확인
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="animate-in fade-in duration-300">
              <Box variant="gray" className="rounded-[24px] bg-slate-50">
                <p className="text-sm font-black text-slate-900">약관 및 운영 안내</p>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  운영 페이지 진입 가능 여부와 알림 수신 동의는 가입 후에도 변경할 수 있습니다.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  {/* 첫 번째 약관 */}
                  <div className="flex items-center justify-between rounded-[18px] border border-white bg-white px-4 py-3">
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-600 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                        checked={isTermsAgreed}
                        onChange={(e) => setIsTermsAgreed(e.target.checked)}
                      />
                      <span className="leading-tight break-keep pr-2">서비스 이용약관과 개인정보 수집 및 이용에 동의합니다.</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenModalType('terms1')}
                      className="shrink-0 text-xs font-bold text-blue-500 underline ml-2 transition-colors hover:text-blue-700"
                    >
                      약관 보기
                    </button>
                  </div>

                  {/* 두 번째 약관 */}
                  <div className="flex items-center justify-between rounded-[18px] border border-white bg-white px-4 py-3">
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-600 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">공연 오픈 알림과 운영 공지 메일을 수신합니다.</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenModalType('terms2')}
                      className="shrink-0 text-xs font-bold text-blue-500 underline ml-2 transition-colors hover:text-blue-700"
                    >
                      약관 보기
                    </button>
                  </div>
                </div>
              </Box>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          {currentStep > 1 && (
            <div className="flex-1">
              <Button type="button" variant="outline" display="block" size="xlarge" onClick={handlePrev}>
                이전
              </Button>
            </div>
          )}
          <div className="flex-1">
            {currentStep < totalSteps ? (
              <Button type="button" display="block" size="xlarge" onClick={handleNext}>
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

      {/* 약관 보기 모달 */}
      <Modal
        isOpen={openModalType !== null}
        onClose={() => setOpenModalType(null)}
        title={openModalType === 'terms1' ? "이용약관 및 개인정보 처리방침" : "마케팅 정보 수신 동의"}
        confirmText="확인"
        showCancelButton={false}
        onConfirm={() => setOpenModalType(null)}
        className="!max-w-[480px]"
      >
        <div className="max-h-[50vh] overflow-y-auto text-sm text-slate-600 leading-relaxed text-left pr-2 mt-4 space-y-5">
          {openModalType === 'terms1' ? (
            <>
              <div>
                <p className="font-bold text-slate-800 mb-1">제 1 조 (목적)</p>
                <p>본 약관은 티클(Tickle)이 제공하는 예매 서비스의 이용조건 및 절차, 이용자와 당사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-1">제 2 조 (이용약관의 효력 및 변경)</p>
                <p>본 약관은 서비스를 신청한 고객에게 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-1">제 3 조 (개인정보 수집 및 이용)</p>
                <p>회사는 원활한 서비스 제공을 위해 최소한의 개인정보(이메일, 이름, 휴대전화 등)를 수집하며, 관계 법령에 따라 안전하게 관리합니다.</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-1">제 4 조 (매크로 및 부정 예매 금지)</p>
                <p>본 플랫폼은 공정한 예매를 위해 비정상적인 접근(매크로 프로그램 등)을 엄격히 금지하며, 적발 시 계정 영구 정지 및 예매 취소 조치가 취해질 수 있습니다.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-bold text-slate-800 mb-1">1. 수신 내용</p>
                <p>관심 공연 오픈 알림, 이벤트, 프로모션 혜택, 플랫폼 주요 운영 공지 및 업데이트 소식</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-1">2. 수신 채널</p>
                <p>이메일, 카카오톡 알림톡, SMS 등</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-1">3. 동의 철회 안내</p>
                <p>동의를 거부하실 권리가 있으며, 동의를 거부하셔도 기본 회원가입 및 예매 서비스는 이용하실 수 있습니다. 가입 후 [마이페이지 - 설정]에서 언제든지 수신 동의를 철회하실 수 있습니다.</p>
              </div>
            </>
          )}
        </div>
      </Modal>
    </UserAuthFrame>
  );
}

export default SignupFormPageClient;
