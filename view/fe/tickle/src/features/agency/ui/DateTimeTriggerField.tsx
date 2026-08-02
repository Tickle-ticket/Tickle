'use client';

import { useId, type ChangeEvent } from 'react';

/**
 * 날짜·시각 선택 모달을 여는 입력 필드입니다.
 */
export function DateTimeTriggerField({
  label,
  value,
  onChange,
  onBlur,
  onOpen,
  placeholder = 'YYYY-MM-DD HH:mm',
  hasError = false,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onOpen: () => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  const inputId = useId();

  return (
    <div className="relative flex w-full flex-col gap-1">
      <label htmlFor={inputId} className="mb-1 text-[13px] font-medium text-content-tertiary">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`
            w-full border-b-[2px] bg-transparent py-1 pr-11 text-[20px] text-content outline-none
            transition-colors tracking-[0.08em] placeholder:text-content-muted sm:text-[22px]
            ${hasError ? 'border-danger hover:border-danger focus:border-danger' : 'border-line-strong hover:border-line-strong focus:border-primary'}
          `}
        />
        <button
          type="button"
          className="absolute bottom-1 right-0 flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition hover:bg-surface-muted hover:text-content-secondary"
          aria-label={`${label} 달력 열기`}
          onClick={onOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
