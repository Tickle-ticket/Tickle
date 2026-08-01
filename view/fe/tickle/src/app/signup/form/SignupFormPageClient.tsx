'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { authApi } from '@/src/shared/api/authApi';
import { ApiError } from '@/src/shared/api/types';
import { setAccessToken } from '@/src/shared/api/tokenManager';
import { Button } from '@/src/shared/components/Button';
import { Modal } from '@/src/shared/components/Modal';
import { type AuthNavigationItem, UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { signupAccountTypeCopy, type SignupAccountType } from '../signupAccountType';
import { useAgencies } from './useAgencies';
import { AccountStep } from '@/src/features/signup/ui/AccountStep';
import { ProfileStep } from '@/src/features/signup/ui/ProfileStep';
import { PhoneVerifyStep } from '@/src/features/signup/ui/PhoneVerifyStep';
import { TermsStep } from '@/src/features/signup/ui/TermsStep';
import {
  AGENCY_APPROVAL_MODAL_CONTENT,
  SIGNUP_ERROR_FIELD_BY_CODE,
  SPECIAL_CHARACTER_PATTERN,
  STEP_LABELS,
  TERM_MODAL_CONTENT,
  type ErrorField,
  type ErrorState,
} from '@/src/features/signup/model/signupTypes';
import {
  convertBirthDateToApiFormat,
  createEmptyErrors,
  getNameError,
  getNicknameError,
  isErrorField,
  isValidBirthDate,
  sanitizeInputValue,
} from '@/src/features/signup/model/signupHelpers';

interface SignupFormPageClientProps {
  initialAccountType: SignupAccountType;
}


export function SignupFormPageClient({ initialAccountType }: SignupFormPageClientProps) {
  const router = useRouter();
  const selectedTypeCopy = signupAccountTypeCopy[initialAccountType];
  const isAgencySignup = initialAccountType === 'agency';
  const { data: agencies = [], isLoading: isAgenciesLoading, isError: isAgenciesError } = useAgencies(isAgencySignup);

  const authTabs: AuthNavigationItem[] = [
    { key: 'audience', label: '일반 회원', href: '/login' },
    { key: 'agency', label: '기획사', href: '/login?mode=agency' },
    { key: 'signup', label: '회원가입', href: '/signup', active: true },
  ];

  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [agencies, selectedAgencyId]
  );

  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    birthDate: '',
    email: '',
    phone: '',
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
  const [isAgencyApprovalModalOpen, setIsAgencyApprovalModalOpen] = useState(false);

  const totalSteps = STEP_LABELS.length;
  const activeModal = openModalType ? TERM_MODAL_CONTENT[openModalType] : null;

  const clearFieldError = (field: ErrorField) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const handleAgencySelect = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    clearFieldError('organization');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const nextValue =
      name === 'phone' || name === 'verificationCode' ? sanitizeInputValue(name, value) : value;

    if (name === 'verificationCode') {
      setVerificationCode(nextValue);
      clearFieldError('verificationCode');
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (isErrorField(name)) {
      clearFieldError(name);
    }

    if (errors.submit) {
      clearFieldError('submit');
    }

    if (name === 'phone') {
      setIsCodeSent(false);
      setIsPhoneVerified(false);
      setVerificationCode('');
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (name === 'name') {
      setErrors((prev) => ({ ...prev, name: getNameError(value, isAgencySignup) }));
      return;
    }

    if (!isAgencySignup && name === 'nickname') {
      setErrors((prev) => ({ ...prev, nickname: getNicknameError(value) }));
    }
  };

  const getStepErrors = (step: number): ErrorState => {
    const nextErrors = createEmptyErrors();

    if (step === 1) {
      if (!formData.email) {
        nextErrors.email = '이메일을 입력해 주세요.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        nextErrors.email = '올바른 이메일 형식을 입력해 주세요.';
      }

      if (!formData.password) {
        nextErrors.password = '비밀번호를 입력해 주세요.';
      } else if (formData.password.length < 8 || !SPECIAL_CHARACTER_PATTERN.test(formData.password)) {
        nextErrors.password = '비밀번호는 8자 이상이며 특수문자를 포함해야 합니다.';
      }

      if (!formData.passwordConfirm) {
        nextErrors.passwordConfirm = '비밀번호 확인을 입력해 주세요.';
      } else if (formData.password !== formData.passwordConfirm) {
        nextErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
      }
    }

    if (step === 2) {
      nextErrors.name = getNameError(formData.name, isAgencySignup);

      if (isAgencySignup && !selectedAgencyId) {
        nextErrors.organization = '기획사를 선택해 주세요.';
      } else if (!isAgencySignup) {
        nextErrors.nickname = getNicknameError(formData.nickname);

        if (!formData.birthDate) {
          nextErrors.birthDate = '생년월일을 입력해 주세요.';
        } else if (!isValidBirthDate(formData.birthDate)) {
          nextErrors.birthDate = '올바른 생년월일을 선택해 주세요.';
        }
      }
    }

    if (step === 3 && !isPhoneVerified) {
      nextErrors.phone = '휴대폰 인증을 완료해 주세요.';
    }

    return nextErrors;
  };

  const validateStep = (step: number) => {
    const nextErrors = getStepErrors(step);
    const hasError = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    return !hasError;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (isAgencySignup && currentStep === 2) {
      setIsAgencyApprovalModalOpen(true);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCloseAgencyApprovalModal = () => {
    setIsAgencyApprovalModalOpen(false);
    router.push('/');
  };

  const handleSendCode = async () => {
    if (!/^010\d{8}$/.test(formData.phone)) {
      setErrors((prev) => ({ ...prev, phone: '휴대폰 번호를 올바르게 입력해 주세요. 예: 01012345678' }));
      return;
    }

    setErrors((prev) => ({ ...prev, phone: '', verificationCode: '' }));
    setIsSendingCode(true);

    try {
      await authApi.sendPhoneCode({ phoneNumber: formData.phone });
      setIsCodeSent(true);
    } catch (error) {
      console.error('sendPhoneCode failed', error);
      setErrors((prev) => ({
        ...prev,
        phone: error instanceof ApiError ? error.message : '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      }));
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

    try {
      await authApi.verifyPhoneCode({ phoneNumber: formData.phone, code: verificationCode });
      setIsPhoneVerified(true);
    } catch (error) {
      console.warn('verifyPhoneCode failed:', error instanceof Error ? error.message : 'Unknown error');
      let errorMessage = '인증번호가 일치하지 않거나 만료되었습니다.';
      if (error instanceof ApiError && error.message && !error.message.includes('No static resource')) {
        errorMessage = error.message;
      }
      setErrors((prev) => ({ ...prev, verificationCode: errorMessage }));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const isSignupDisabled = isAgencySignup || !isPhoneVerified || isSubmitting || !isTermsAgreed;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    for (const step of [1, 2, 3]) {
      const stepErrors = getStepErrors(step);
      if (Object.values(stepErrors).some(Boolean)) {
        setErrors(stepErrors);
        setCurrentStep(step);
        return;
      }
    }

    if (isAgencySignup) {
      setCurrentStep(2);
      setIsAgencyApprovalModalOpen(true);
      return;
    }

    if (!isTermsAgreed) {
      setCurrentStep(4);
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      const response = await authApi.signup({
        email: formData.email,
        password: formData.password,
        name: formData.name.trim(),
        nickname: isAgencySignup ? undefined : formData.nickname.trim(),
        birthDate: isAgencySignup ? undefined : convertBirthDateToApiFormat(formData.birthDate),
        phoneNumber: formData.phone,
        role: isAgencySignup ? 'ORGANIZER' : 'USER',
        organizerName: isAgencySignup ? selectedAgency?.name : undefined,
      });

      if (response.data) {
        setAccessToken(response.data.accessToken);
        router.push('/');
      }
    } catch (error) {
      console.error('Signup failed', error);

      const message =
        error instanceof ApiError
          ? error.message
          : '회원가입에 실패했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.';
      // 원인이 특정 입력값이면 그 칸에 붙여야 어디를 고칠지 알 수 있다.
      const field =
        error instanceof ApiError && error.code
          ? SIGNUP_ERROR_FIELD_BY_CODE[error.code]
          : undefined;

      setErrors((prev) => ({ ...prev, [field ?? 'submit']: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <UserAuthFrame
        activeTab="signup"
        size="wide"
        authTabs={authTabs}
        label={selectedTypeCopy.label}
        title={isAgencySignup ? '운영에 사용할 계정을 만들어 주세요.' : '예매에 사용할 계정을 만들어 주세요.'}
      >
        <div className="mb-6 grid grid-cols-4 gap-2">
          {STEP_LABELS.map((stepLabel, index) => {
            const stepNo = index + 1;
            const isActive = currentStep === stepNo;
            const isCompleted = currentStep > stepNo;

            return (
              <div key={stepLabel} className="space-y-2">
                <div className={`h-1.5 rounded-full ${isCompleted || isActive ? 'bg-primary' : 'bg-surface-active'}`} />
                <p className={`text-xs font-bold ${isActive ? 'text-content' : 'text-content-muted'}`}>{stepLabel}</p>
              </div>
            );
          })}
        </div>

        <p className="mb-6 text-sm leading-6 text-content-tertiary">{selectedTypeCopy.cardDescription}</p>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <input type="hidden" name="accountType" value={initialAccountType} />
          {isAgencySignup ? <input type="hidden" name="agencyId" value={selectedAgencyId} /> : null}

          <div className="min-h-[320px] md:min-h-[340px]">
            {currentStep === 1 ? (
              <AccountStep
                errors={errors}
                formData={formData}
                handleChange={handleChange}
              />
            ) : null}

            {currentStep === 2 ? (
              <ProfileStep
                errors={errors}
                formData={formData}
                handleAgencySelect={handleAgencySelect}
                handleBlur={handleBlur}
                handleChange={handleChange}
                isAgencySignup={isAgencySignup}
                selectedAgencyId={selectedAgencyId}
                agencies={agencies}
                isAgenciesLoading={isAgenciesLoading}
                isAgenciesError={isAgenciesError}
              />
            ) : null}

            {currentStep === 3 ? (
              <PhoneVerifyStep
                errors={errors}
                formData={formData}
                handleChange={handleChange}
                handleSendCode={handleSendCode}
                handleVerifyCode={handleVerifyCode}
                isCodeSent={isCodeSent}
                isPhoneVerified={isPhoneVerified}
                isSendingCode={isSendingCode}
                isVerifyingCode={isVerifyingCode}
                verificationCode={verificationCode}
              />
            ) : null}

            {currentStep === 4 ? (
              <TermsStep
                formData={formData}
                isAgencySignup={isAgencySignup}
                isTermsAgreed={isTermsAgreed}
                receiveAnnouncements={receiveAnnouncements}
                selectedAgency={selectedAgency}
                selectedTypeCopy={selectedTypeCopy}
                setIsTermsAgreed={setIsTermsAgreed}
                setOpenModalType={setOpenModalType}
                setReceiveAnnouncements={setReceiveAnnouncements}
              />
            ) : null}
          </div>

          {errors.submit ? <p className="text-sm font-medium text-danger">{errors.submit}</p> : null}

          <div className="flex gap-3 pt-1 pb-4">
            {currentStep > 1 ? (
              <div className="flex-1">
                <Button 
                  type="button" 
                  variant="weak" 
                  color="light" 
                  display="block" 
                  size="xlarge" 
                  onClick={handlePrev}
                  className="!border !border-line !bg-surface !text-content-secondary hover:!bg-surface-subtle"
                >
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

      <Modal
        isOpen={isAgencyApprovalModalOpen}
        onClose={handleCloseAgencyApprovalModal}
        onConfirm={handleCloseAgencyApprovalModal}
        title={AGENCY_APPROVAL_MODAL_CONTENT.title}
        description={AGENCY_APPROVAL_MODAL_CONTENT.description}
        confirmText="확인"
        showCancelButton={false}
      />
    </>
  );
}

export default SignupFormPageClient;
