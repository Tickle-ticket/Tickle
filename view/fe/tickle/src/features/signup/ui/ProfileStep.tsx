'use client';

import type { AgencyOption } from '@/src/app/signup/form/useAgencies';
import type { ChangeEvent, FocusEvent } from 'react';
import type { ErrorState, SignupFormData } from '@/src/features/signup/model/signupTypes';
import { Input } from '@/src/shared/components/Input';
import { AgencyDropdownField } from '@/src/features/signup/ui/AgencyDropdownField';

/**
 * 기본 정보(이름·닉네임·생년월일·소속) 입력 단계입니다.
 */
export const ProfileStep = ({
  errors,
  formData,
  handleAgencySelect,
  handleBlur,
  handleChange,
  isAgencySignup,
  selectedAgencyId,
  agencies,
  isAgenciesLoading,
  isAgenciesError,
}: {
  errors: ErrorState;
  formData: SignupFormData;
  handleAgencySelect: (agencyId: string) => void;
  handleBlur: (event: FocusEvent<HTMLInputElement>) => void;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isAgencySignup: boolean;
  selectedAgencyId: string;
  agencies: AgencyOption[];
  isAgenciesLoading: boolean;
  isAgenciesError: boolean;
}) => (
  <div className="animate-in fade-in duration-300">
    <div className="flex flex-col gap-5">
      <Input
        label={isAgencySignup ? '담당자명' : '이름'}
        name="name"
        placeholder={isAgencySignup ? '담당자명을 입력해 주세요.' : '이름을 입력해 주세요.'}
        autoComplete="name"
        maxLength={12}
        fullWidth
        required
        value={formData.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.name}
      />
      {!isAgencySignup ? (
        <>
          <Input
            label="닉네임"
            name="nickname"
            placeholder="닉네임을 입력해 주세요."
            autoComplete="nickname"
            maxLength={20}
            fullWidth
            required
            value={formData.nickname}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.nickname}
          />
          <Input
            label="생년월일"
            type="text"
            name="birthDate"
            placeholder="예: 19900101 (8자리)"
            inputMode="numeric"
            fullWidth
            required
            value={formData.birthDate}
            onChange={handleChange}
            error={errors.birthDate}
          />
        </>
      ) : null}

      {isAgencySignup ? (
        <AgencyDropdownField
          agencies={agencies}
          isLoading={isAgenciesLoading}
          isError={isAgenciesError}
          selectedAgencyId={selectedAgencyId}
          onSelect={handleAgencySelect}
          error={errors.organization}
        />
      ) : null}
    </div>
  </div>
);
