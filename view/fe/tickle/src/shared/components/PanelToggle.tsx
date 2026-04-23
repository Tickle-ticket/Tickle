import React from 'react';
import type { PanelToggleProps } from './types';

export const PanelToggle = ({ 
  isFolded, 
  onToggle, 
  side = 'left',
  variant = 'attached',
  className = '', 
  isLoading = false 
}: PanelToggleProps) => {
  if (isLoading) {
    return (
      <div className={`hidden lg:block absolute top-1/2 -translate-y-1/2 z-50 w-12 h-12 bg-gray-200 rounded-full animate-pulse ${className}`} />
    );
  }

  // 방향에 따른 위치 및 형태 계산
  const isLeft = side === 'left';
  
  // attached 스타일의 모서리 반경 설정
  const attachedRadius = isLeft ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0';
  
  // 버튼 기본 위치 설정
  // 'left' 사이드바인 경우: 접히면 left-0, 열리면 left-[40%] (또는 부모에서 제어)
  // 'right' 사이드바인 경우: 접히면 right-0, 열리면 right-[40%]
  const defaultPosition = isLeft 
    ? (isFolded ? 'left-0' : 'left-[40%] -translate-x-1/2') 
    : (isFolded ? 'right-0' : 'right-[40%] translate-x-1/2');

  const variantStyles = variant === 'attached'
    ? `${isFolded ? attachedRadius : 'rounded-full h-12 w-12 border-black/10'}`
    : `rounded-full h-12 w-12 border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.08)]`;

  // 화살표 방향 (왼쪽 사이드바면 기본이 닫힐때 왼쪽을 향함, 접히면 오른쪽을 향함)
  const isArrowPointingRight = isLeft ? isFolded : !isFolded;

  return (
    <button
      onClick={onToggle}
      className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 z-50 items-center justify-center w-8 h-16 bg-white border border-black/10 shadow-lg text-zinc-500 hover:text-black transition-all duration-500 ease-in-out ${variantStyles} ${!className.includes('left-') && !className.includes('right-') ? defaultPosition : ''} ${className}`}
      aria-label={isFolded ? "포스터 열기" : "포스터 닫기"}
    >
      <svg
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        className={`w-4 h-4 transition-transform duration-500 ${isArrowPointingRight ? 'rotate-180' : ''}`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  );
};
