'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgencyDropdownFieldProps } from '@/src/features/signup/model/signupTypes';

/**
 * 기획사 회원가입에서 소속 기획사를 고르는 드롭다운입니다.
 */
export function AgencyDropdownField({
  agencies,
  isLoading,
  isError,
  selectedAgencyId,
  onSelect,
  error,
}: AgencyDropdownFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedAgency = useMemo(
    () => agencies.find((agency) => agency.id === selectedAgencyId),
    [agencies, selectedAgencyId]
  );

  const isDisabled = isLoading || isError || agencies.length === 0;

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

  const placeholderText = isLoading
    ? '기획사 목록을 불러오는 중입니다.'
    : isError
      ? '기획사 목록을 불러오지 못했습니다.'
      : '기획사를 선택해 주세요.';

  return (
    <div className="flex w-full flex-col gap-1">
      <span className="mb-1 text-[13px] font-medium text-content-tertiary">기획사명</span>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`flex w-full items-center justify-between border-b-[2px] bg-transparent py-2 text-[16px] text-content outline-none transition-colors disabled:cursor-not-allowed disabled:text-content-muted ${isOpen ? 'border-primary' : error ? 'border-danger' : 'border-line-strong'
            }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={isDisabled}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className={`truncate text-left ${selectedAgency ? '' : 'text-content-muted'}`}>
            {selectedAgency?.name ?? placeholderText}
          </span>
          <svg
            className={`ml-3 h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : 'text-content-muted'}`}
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
              {agencies.map((agency) => {
                const isSelected = agency.id === selectedAgencyId;

                return (
                  <button
                    key={agency.id}
                    type="button"
                    className={`w-full rounded-xl px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-primary-subtle text-primary-hover' : 'text-content-secondary hover:bg-surface-subtle'
                      }`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(agency.id);
                      setIsOpen(false);
                    }}
                  >
                    <p className="text-sm font-black">{agency.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      {error ? <span className="mt-1 text-[12px] text-danger">{error}</span> : null}
      <span className="text-xs font-medium text-content-muted">등록된 기획사만 선택할 수 있습니다.</span>
    </div>
  );
}
