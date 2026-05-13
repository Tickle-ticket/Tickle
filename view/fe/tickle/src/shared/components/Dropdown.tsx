'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = '선택',
  disabled = false,
  isLoading = false,
  className = '',
  buttonClassName = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value);
  const isInteractionDisabled = disabled || isLoading || options.length === 0;

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
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {label ? (
        <span className="mb-1 text-[13px] font-medium text-content-tertiary">{label}</span>
      ) : null}

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`flex h-11 w-full items-center justify-between rounded-lg border border-line-strong bg-surface px-3 text-sm font-bold text-content outline-none transition-colors hover:bg-surface-subtle focus:border-primary focus:ring-2 focus:ring-primary-light disabled:cursor-not-allowed disabled:text-content-muted ${
            isOpen ? 'border-primary ring-2 ring-primary-light' : ''
          } ${buttonClassName}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          disabled={isInteractionDisabled}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="min-w-0 truncate text-left">
            {isLoading ? '불러오는 중' : selectedOption?.label ?? placeholder}
          </span>
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

        {isOpen && !isInteractionDisabled ? (
          <div
            id={listboxId}
            className="absolute left-0 top-full z-20 mt-3 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_46px_rgba(15,23,42,0.12)]"
            role="listbox"
          >
            <div className="max-h-72 overflow-y-auto p-2">
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full rounded-xl px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:text-content-muted ${
                      isSelected
                        ? 'bg-primary-subtle text-primary-hover'
                        : 'text-content-secondary hover:bg-surface-subtle'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="block truncate text-sm font-black">{option.label}</span>
                    {option.description ? (
                      <span className="mt-1 block truncate text-xs font-semibold text-content-tertiary">
                        {option.description}
                      </span>
                    ) : null}
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

export default Dropdown;
