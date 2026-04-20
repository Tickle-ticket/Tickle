import React, { forwardRef, useId } from 'react';
import type { InputProps } from './types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, isLoading = false, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id || generatedId;

    if (isLoading) {
      return (
        <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}>
          {/* 라벨 스켈레톤 */}
          {label && <div className="h-[18px] w-16 bg-gray-200 animate-pulse rounded-sm mb-1" />}
          
          {/* 입력 텍스트 및 바텀 라인 스켈레톤 */}
          <div className={`h-[36px] ${fullWidth ? 'w-full' : 'w-[200px]'} bg-gray-200 animate-pulse rounded-sm`} />
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-gray-500 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            border-b-[2px] border-gray-300 bg-transparent py-1 text-[24px] outline-none
            focus:border-blue-500 text-gray-900 transition-colors tracking-widest placeholder:text-gray-300
            ${error ? 'border-red-500 focus:border-red-500' : ''}
          `}
          {...props}
        />
        {error && <span className="text-[12px] text-red-500 mt-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
