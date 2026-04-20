import React, { forwardRef, useState } from 'react';
import type { SearchBarProps } from './types';

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value: externalValue,
      defaultValue = '',
      onChange,
      onClear,
      fullWidth = false,
      isLoading = false,
      placeholder = '검색어를 입력하세요',
      className = '',
      ...props
    },
    ref
  ) => {
    // 외부에서 value를 직접 다루는(Controlled) 방식인지 자동(Uncontrolled)인지 구분
    const isControlled = externalValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(defaultValue as string);

    const value = isControlled ? externalValue : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }
      onClear?.();
    };

    // 토스(Toss) 스타일의 프리미엄 스켈레톤 UI
    if (isLoading) {
      return (
        <div
          className={`flex items-center gap-3 h-[52px] px-4 rounded-xl border-[2px] border-blue-500 bg-white ${fullWidth ? 'w-full' : 'w-[320px]'} ${className}`}
          aria-hidden="true"
        >
          {/* 돋보기 자리 스켈레톤 */}
          <div className="w-[20px] h-[20px] rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          {/* 텍스트 힌트 자리 스켈레톤 */}
          <div className="h-[14px] w-[120px] bg-gray-200 animate-pulse rounded-md" />
        </div>
      );
    }

    return (
      <div
        className={`
          flex items-center gap-3 h-[52px] px-4 rounded-xl border-[2px] transition-all bg-white
          border-blue-500 shadow-sm
          focus-within:ring-4 focus-within:ring-blue-100
          ${fullWidth ? 'w-full' : 'w-[320px]'}
          ${className}
        `}
      >
        {/* 왼쪽 돋보기 아이콘 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400 flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {/* 가운데 실제 입력창 (투명) */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-gray-800 text-[16px] outline-none placeholder:text-gray-400 font-medium tracking-wide"
          {...props}
        />

        {/* 오른쪽 텍스트 지우기(X) 아이콘 - 값이 있을 때만 나타납니다 */}
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            aria-label="검색어 지우기"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                d="M15 9L9 15M9 9l6 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
