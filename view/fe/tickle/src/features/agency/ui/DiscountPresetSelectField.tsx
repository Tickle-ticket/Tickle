'use client';

import { useEffect, useRef, useState } from 'react';
import type { SeatDiscountDraft } from '@/src/features/agency/model/registrationTypes';
import { discountPresetOptions } from '@/src/features/agency/model/registrationHelpers';

/**
 * 할인 종류를 고르는 선택 필드입니다. 직접 입력도 받습니다.
 */
export function DiscountPresetSelectField({
  value,
  onChange,
}: {
  value: SeatDiscountDraft['preset'];
  onChange: (preset: SeatDiscountDraft['preset']) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = discountPresetOptions.find((option) => option.value === value) ?? discountPresetOptions[0];

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

  return (
    <div className="flex flex-col gap-1">
      <span className="mb-1 text-[13px] font-medium text-content-tertiary">할인 유형</span>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`flex w-full items-center justify-between border-b-[2px] bg-transparent py-1 text-[20px] text-content outline-none transition-colors sm:text-[22px] ${
            isOpen ? 'border-primary' : 'border-line-strong'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="truncate text-left">{selectedOption.label}</span>
          <svg
            className={`ml-3 h-5 w-5 shrink-0 transition-transform ${
              isOpen ? 'rotate-180 text-primary' : 'text-content-muted'
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
            className="absolute left-0 top-full z-20 mt-3 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.12)]"
            role="listbox"
          >
            <div className="max-h-72 overflow-y-auto p-2">
              {discountPresetOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-black transition-colors ${
                      isSelected
                        ? 'bg-primary-subtle text-primary-hover'
                        : 'text-content-secondary hover:bg-surface-subtle'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
