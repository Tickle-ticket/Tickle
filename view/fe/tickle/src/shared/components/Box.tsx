import React from 'react';
import type { BoxProps } from './types';

export const Box = ({ 
  children, 
  padding = 'medium', 
  variant = 'shadow',
  className = '',
  isLoading = false,
  ...rest 
}: BoxProps) => {

  const paddingClasses = {
    none: 'p-0',
    small: 'p-3 sm:p-4',
    medium: 'p-4 sm:p-6',
    large: 'p-6 sm:p-8',
  };

  const variantClasses = {
    flat: 'bg-white', // 그림자가 없는 순수한 흰 배경 영역
    outline: 'bg-white border border-gray-200', // 테두리만 있는 영역
    shadow: 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5', // 고급스러운 토스 스타일 그림자 영역
    gray: 'bg-[#F2F4F6] text-gray-800', // 내부를 다시 나눌 때 쓰는 옅은 회색 배경
  };

  if (isLoading) {
    return (
      <div 
        className={`block w-full bg-gray-200 animate-pulse rounded-[16px] sm:rounded-[20px] transition-colors overflow-hidden ${paddingClasses[padding]} ${className}`}
        {...rest}
      >
        <div style={{ opacity: 0, pointerEvents: 'none' }}>{children}</div>
      </div>
    );
  }

  return (
    <div 
      className={`block w-full rounded-[16px] sm:rounded-[20px] transition-colors overflow-hidden ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
