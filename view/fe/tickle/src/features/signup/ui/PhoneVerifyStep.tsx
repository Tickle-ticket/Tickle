'use client';
import type { ChangeEvent } from 'react';
import type { ErrorState, SignupFormData } from '@/src/features/signup/model/signupTypes';
import { Input } from '@/src/shared/components/Input';
import { Button } from '@/src/shared/components/Button';

/**
 * 휴대폰 본인 확인 단계입니다.
 */
export const PhoneVerifyStep = ({
  errors,
  formData,
  handleChange,
  handleSendCode,
  handleVerifyCode,
  isCodeSent,
  isPhoneVerified,
  isSendingCode,
  isVerifyingCode,
  verificationCode,
}: {
  errors: ErrorState;
  formData: SignupFormData;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSendCode: () => void;
  handleVerifyCode: () => void;
  isCodeSent: boolean;
  isPhoneVerified: boolean;
  isSendingCode: boolean;
  isVerifyingCode: boolean;
  verificationCode: string;
}) => (
  <div className="animate-in fade-in duration-300">
    <div className="flex flex-col gap-5">
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
    </div>
  </div>
);
