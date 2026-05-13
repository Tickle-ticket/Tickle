import React, { forwardRef, useId, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import type { InputProps } from './types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, isLoading = false, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = props.type === 'password';
    const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : props.type;

    if (isLoading) {
      return (
        <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}>
          {/* 라벨 스켈레톤 */}
          {label && <div className="h-[18px] w-16 bg-surface-active animate-pulse rounded-sm mb-1" />}
          
          {/* 입력 텍스트 및 바텀 라인 스켈레톤 */}
          <div className={`h-[36px] ${fullWidth ? 'w-full' : 'w-[200px]'} bg-surface-active animate-pulse rounded-sm`} />
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-content-tertiary mb-1">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full border-b-[2px] border-line-strong bg-transparent py-2 text-base outline-none
              focus:border-primary text-content transition-colors placeholder:text-content-muted
              ${isPasswordType ? 'pr-10' : ''}
              ${error ? 'border-danger focus:border-danger' : ''}
            `}
            {...props}
            type={inputType}
          />
          {isPasswordType && (
            <button
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-content-muted hover:text-content-secondary focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
        {error && <span className="text-[12px] text-danger mt-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
