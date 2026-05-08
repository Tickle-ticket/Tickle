'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/src/shared/api/authApi';
import { setTokens } from '@/src/shared/api/tokenManager';
import { ApiError } from '@/src/shared/api/types';
import { Button } from '@/src/shared/components/Button';
import { Input } from '@/src/shared/components/Input';
import { type AuthNavigationItem, UserAuthFrame } from '@/src/shared/components/UserAuthFrame';
import { clearKakaoSignUpToken, getKakaoSignUpToken } from '@/src/shared/lib/kakaoSignupToken';

type ErrorState = {
  name: string;
  birthDate: string;
  phone: string;
  verificationCode: string;
  submit: string;
};

const NAME_PATTERN = /^[A-Za-z가-힣\s]+$/;
const PHONE_PATTERN = /^010\d{8}$/;

const createEmptyErrors = (): ErrorState => ({
  name: '',
  birthDate: '',
  phone: '',
  verificationCode: '',
  submit: '',
});

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isValidBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  return value <= getTodayDate();
};

const getNameError = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '이름을 입력해 주세요.';
  }

  if (Array.from(trimmedValue).length > 12) {
    return '이름은 12자 이하로 입력해 주세요.';
  }

  if (!NAME_PATTERN.test(trimmedValue)) {
    return '이름에는 한글과 영문만 사용할 수 있습니다.';
  }

  return '';
};

const authTabs: AuthNavigationItem[] = [
  { key: 'audience', label: '일반 회원', href: '/login' },
  { key: 'agency', label: '기획사', href: '/login?mode=agency' },
  { key: 'signup', label: '회원가입', href: '/signup', active: true },
];

export function KakaoSignupPageClient() {
  const router = useRouter();
  const todayDate = useMemo(() => getTodayDate(), []);
  const [signUpToken, setSignUpToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phone: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [errors, setErrors] = useState<ErrorState>(createEmptyErrors);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = getKakaoSignUpToken();

    if (!storedToken) {
      router.replace('/login');
      return;
    }

    setSignUpToken(storedToken);
    setIsReady(true);
  }, [router]);

  const handleExpiredSession = () => {
    clearKakaoSignUpToken();
    alert('카카오 가입 세션이 만료되었습니다. 다시 로그인해 주세요.');
    router.replace('/login');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (name === 'verificationCode') {
      const nextCode = value.replace(/\D/g, '').slice(0, 6);
      setVerificationCode(nextCode);
      setErrors((prev) => ({ ...prev, verificationCode: '', submit: '' }));
      return;
    }

    const nextValue =
      name === 'phone'
        ? value.replace(/\D/g, '').slice(0, 11)
        : name === 'name'
          ? value.slice(0, 12)
          : value;

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: '', submit: '' }));

    if (name === 'phone') {
      setIsCodeSent(false);
      setIsPhoneVerified(false);
      setVerificationCode('');
      setErrors((prev) => ({ ...prev, verificationCode: '' }));
    }
  };

  const validateForm = () => {
    const nextErrors = createEmptyErrors();

    nextErrors.name = getNameError(formData.name);

    if (!formData.birthDate) {
      nextErrors.birthDate = '생년월일을 입력해 주세요.';
    } else if (!isValidBirthDate(formData.birthDate)) {
      nextErrors.birthDate = '생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.';
    }

    if (!PHONE_PATTERN.test(formData.phone)) {
      nextErrors.phone = '휴대폰 번호를 올바르게 입력해 주세요. 예: 01012345678';
    } else if (!isPhoneVerified) {
      nextErrors.phone = '휴대폰 인증을 완료해 주세요.';
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSendCode = async () => {
    if (!PHONE_PATTERN.test(formData.phone)) {
      setErrors((prev) => ({
        ...prev,
        phone: '휴대폰 번호를 올바르게 입력해 주세요. 예: 01012345678',
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, phone: '', verificationCode: '', submit: '' }));
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
    if (!signUpToken) {
      handleExpiredSession();
      return;
    }

    if (!verificationCode) {
      setErrors((prev) => ({ ...prev, verificationCode: '인증번호를 입력해 주세요.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, verificationCode: '', submit: '' }));
    setIsVerifyingCode(true);

    try {
      await authApi.verifyPhoneCode({ phoneNumber: formData.phone, code: verificationCode });
      setIsPhoneVerified(true);
    } catch (error) {
      console.error('verifyPhoneCode failed', error);

      if (error instanceof ApiError && error.status === 401) {
        handleExpiredSession();
        return;
      }

      setErrors((prev) => ({
        ...prev,
        verificationCode:
          error instanceof ApiError ? error.message : '인증번호가 일치하지 않거나 만료되었습니다.',
      }));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!signUpToken) {
      handleExpiredSession();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      const response = await authApi.kakaoSignup({
        signUpToken,
        name: formData.name.trim(),
        birthDate: formData.birthDate,
        phoneNumber: formData.phone,
      });

      clearKakaoSignUpToken();

      if (response.data) {
        setTokens(response.data.accessToken, response.data.refreshToken, response.data.userId);
        router.replace('/');
      }
    } catch (error) {
      console.error('kakaoSignup failed', error);

      if (error instanceof ApiError && error.status === 401) {
        handleExpiredSession();
        return;
      }

      setErrors((prev) => ({
        ...prev,
        submit: error instanceof ApiError ? error.message : '카카오 회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
          <p className="text-sm font-medium text-slate-500">카카오 가입 정보를 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <UserAuthFrame
      activeTab="signup"
      size="wide"
      authTabs={authTabs}
      label="카카오 회원가입"
      title="추가 정보를 입력해 주세요."
    >
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <p className="text-sm font-medium leading-6 text-slate-500">
          카카오 계정 연결은 완료되었습니다. 예매에 필요한 이름, 생년월일, 휴대폰 인증만 마무리해 주세요.
        </p>

        <div className="grid gap-5">
          <Input
            label="이름"
            name="name"
            placeholder="이름을 입력해 주세요."
            autoComplete="name"
            fullWidth
            required
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
          />

          <Input
            label="생년월일"
            type="date"
            name="birthDate"
            fullWidth
            required
            value={formData.birthDate}
            onChange={handleChange}
            error={errors.birthDate}
            max={todayDate}
          />

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="휴대폰번호"
                type="tel"
                name="phone"
                placeholder="01012345678"
                autoComplete="tel"
                inputMode="numeric"
                fullWidth
                required
                value={formData.phone}
                onChange={handleChange}
                disabled={isPhoneVerified}
                error={errors.phone}
              />
            </div>
            <Button
              type="button"
              size="large"
              className="mb-[2px] h-[43px] whitespace-nowrap px-4"
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
                  inputMode="numeric"
                  fullWidth
                  value={verificationCode}
                  onChange={handleChange}
                  error={errors.verificationCode}
                />
              </div>
              <Button
                type="button"
                size="large"
                className="mb-[2px] h-[43px] whitespace-nowrap px-4"
                onClick={handleVerifyCode}
                disabled={isVerifyingCode || !verificationCode}
                isLoading={isVerifyingCode}
              >
                확인
              </Button>
            </div>
          ) : null}

          {isPhoneVerified ? <p className="text-sm font-medium text-emerald-600">휴대폰 인증이 완료되었습니다.</p> : null}
        </div>

        {errors.submit ? <p className="text-sm font-medium text-red-500">{errors.submit}</p> : null}

        <Button
          type="submit"
          display="block"
          size="xlarge"
          disabled={!isPhoneVerified || isSubmitting}
          isLoading={isSubmitting}
        >
          가입 완료
        </Button>
      </form>
    </UserAuthFrame>
  );
}

export default KakaoSignupPageClient;
