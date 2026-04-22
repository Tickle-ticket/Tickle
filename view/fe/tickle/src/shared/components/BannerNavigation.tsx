import React from 'react';
import type { BannerNavigationProps } from './types';

export const BannerNavigation = ({
  onNext,
  onPrev,
  current,
  total,
  variant = 'arrow',
  className = '',
  isLoading = false,
}: BannerNavigationProps) => {
  if (isLoading) return null;

  // 점점점(Dots) 형태: 토스 스타일의 점 형태 인디케이터
  if (variant === 'dots') {
    const dotsArray = Array.from({ length: total || 1 });
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {dotsArray.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === current
                ? 'w-5 bg-white drop-shadow-md'
                : 'w-1.5 bg-white/40 drop-shadow-sm'
            }`}
          />
        ))}
      </div>
    );
  }

  // 배지 형태: 포스터 우측 상단 등에 들어가는 반투명한 인디케이터
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs md:text-sm font-medium tracking-wide shadow-lg ${className}`}>
        <span>{current}</span>
        <span className="opacity-40">/</span>
        <span className="opacity-70">{total}</span>
        
        {(onNext || onPrev) && (
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/20">
            <button onClick={onPrev} aria-label="이전" className="p-1 hover:bg-white/20 active:bg-white/30 rounded-full transition-colors">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button onClick={onNext} aria-label="다음" className="p-1 hover:bg-white/20 active:bg-white/30 rounded-full transition-colors">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 스크롤 다운 형태: 플로팅되어 예쁘게 떨어지는 화이트 원형 버튼
  if (variant === 'scroll-down') {
    return (
      <button 
        onClick={onNext}
        className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95 transition-all text-gray-400 hover:text-blue-600 group ${className}`}
        aria-label="다음 포스터 보기"
      >
        <svg 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2.5} 
          stroke="currentColor" 
          className="w-6 h-6 md:w-7 md:h-7 group-hover:translate-y-1 transition-transform"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
    );
  }

  // 기본 형태: 토스 스타일의 통합된 알약(Pill) 형태의 화이트 내비게이션 바
  return (
    <div className={`inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 min-w-min ${className}`}>
      {/* 이전 버튼 */}
      <button 
        onClick={onPrev}
        className="p-2 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-400 hover:text-gray-900"
        aria-label="이전 포스터"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* 포스터 번호 표시 (ex: 1 / 5) */}
      {current !== undefined && total !== undefined && (
        <div className="text-base font-bold text-gray-800 tracking-wider flex items-center min-w-[3.5rem] justify-center">
          <span className="text-blue-600">{current}</span> 
          <span className="text-gray-200 mx-2 text-sm">/</span> 
          <span className="text-gray-400">{total}</span>
        </div>
      )}

      {/* 다음 버튼 */}
      <button 
        onClick={onNext}
        className="p-2 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-400 hover:text-gray-900"
        aria-label="다음 포스터"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
};
