'use client';
import type { ChangeEvent } from 'react';
import type { ErrorState, SignupFormData } from '@/src/features/signup/model/signupTypes';
import { Input } from '@/src/shared/components/Input';

/**
 * 계정 정보(이메일·비밀번호) 입력 단계입니다.
 */
export const AccountStep = ({
  errors,
  formData,
  handleChange,
}: {
  errors: ErrorState;
  formData: SignupFormData;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="animate-in fade-in duration-300">
    <div className="flex flex-col gap-5">
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
      />
      <Input
        label="비밀번호"
        type="password"
        name="password"
        placeholder="8자 이상, 특수문자 포함"
        autoComplete="new-password"
        fullWidth
        required
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
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
      />
    </div>
  </div>
);
