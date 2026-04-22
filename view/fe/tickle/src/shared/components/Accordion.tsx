import React, { useState } from 'react';
import type { AccordionProps } from './types';

export const Accordion = ({
  title,
  children,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  className = '',
  isLoading = false,
}: AccordionProps) => {
  // 제어(Controlled) 모드와 비제어(Uncontrolled) 모드 모두 지원
  const [isInternalOpen, setIsInternalOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : isInternalOpen;

  const handleToggle = () => {
    const nextState = !isOpen;
    if (!isControlled) {
      setIsInternalOpen(nextState);
    }
    onToggle?.(nextState);
  };

  if (isLoading) {
    return (
      <div className={`w-full border-b border-gray-100 last:border-b-0 py-4 md:py-5 ${className}`} aria-hidden="true">
        <div className="flex justify-between items-center shrink-0 w-full">
          {/* 타이틀 스켈레톤 */}
          <div className="w-1/3 h-6 bg-gray-200 rounded-md animate-pulse" />
          {/* 화살표 스켈레톤 */}
          <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full border-b border-gray-100 last:border-b-0 ${className}`}>
      {/* 아코디언 헤더(토글 버튼) */}
      <button
        type="button"
        className="w-full flex justify-between items-center py-4 md:py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded-lg transition-opacity hover:opacity-80 active:opacity-60"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div className="text-[17px] md:text-[19px] font-semibold text-gray-900 pr-4">
          {title}
        </div>
        {/* 우측 쉐브론 화살표 애니메이션 */}
        <div 
          className={`shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${
            isOpen ? 'rotate-180 text-[#3182f6]' : 'rotate-0 text-gray-400'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 9L12 15L6 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      
      {/* 아코디언 내용 영역 (CSS Grid 활용 부드러운 높이 애니메이션) */}
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pb-4 md:pb-5 text-[15px] md:text-[16px] text-gray-600 leading-relaxed font-medium">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
