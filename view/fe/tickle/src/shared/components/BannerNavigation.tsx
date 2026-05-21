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
                ? 'w-5 bg-surface drop-shadow-md'
                : 'w-1.5 bg-surface/40 drop-shadow-sm'
            }`}
          />
        ))}
      </div>
    );
  }

  // 배지 형태: 사용자가 첨부한 다크 둥근 알약 형태 (1 / 3 | < >)
  if (variant === 'badge') {
    return (
      <div 
        className={`inline-flex items-center px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white font-medium shadow-md ${className}`}
        onClick={(e) => e.stopPropagation()} // 배너 클릭 이벤트 전파 방지
      >
        {/* 숫자 부분 */}
        <div className="flex items-center gap-1.5 text-[15px] font-bold mr-4">
          <span className="text-white">{current}</span>
          <span className="text-white/40">/</span>
          <span className="text-white/60">{total}</span>
        </div>
        
        {/* 화살표 및 구분선 부분 */}
        {(onNext || onPrev) && (
          <div className="flex items-center gap-3 pl-4 border-l border-white/20">
            <button 
              onClick={(e) => { e.stopPropagation(); onPrev?.(); }} 
              aria-label="이전" 
              className="text-white hover:text-white/70 active:scale-90 transition-all"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-[18px] h-[18px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onNext?.(); }} 
              aria-label="다음" 
              className="text-white hover:text-white/70 active:scale-90 transition-all"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-[18px] h-[18px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 배지 화살표 전용 형태: 숫자 없이 좌우 화살표만 있는 다크 알약 형태
  if (variant === 'badge-arrows') {
    return (
      <div 
        className={`inline-flex items-center px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm shadow-md ${className}`}
        onClick={(e) => e.stopPropagation()} // 배너 클릭 이벤트 전파 방지
      >
        {(onNext || onPrev) && (
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onPrev?.(); }} 
              aria-label="이전" 
              className="text-white hover:text-white/70 active:scale-90 transition-all"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-[18px] h-[18px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onNext?.(); }} 
              aria-label="다음" 
              className="text-white hover:text-white/70 active:scale-90 transition-all"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-[18px] h-[18px]">
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
        className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-line-subtle/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95 transition-all text-content-muted hover:text-primary group ${className}`}
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
    <div className={`inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-line-subtle min-w-min ${className}`}>
      {/* 이전 버튼 */}
      <button 
        onClick={onPrev}
        className="p-2 flex items-center justify-center rounded-full hover:bg-surface-muted active:bg-surface-active transition-colors text-content-muted hover:text-content"
        aria-label="이전 포스터"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* 포스터 번호 표시 (ex: 1 / 5) */}
      {current !== undefined && total !== undefined && (
        <div className="text-base font-bold text-content tracking-wider flex items-center min-w-[3.5rem] justify-center">
          <span className="text-primary">{current}</span> 
          <span className="text-content-inverse-muted mx-2 text-sm">/</span> 
          <span className="text-content-muted">{total}</span>
        </div>
      )}

      {/* 다음 버튼 */}
      <button 
        onClick={onNext}
        className="p-2 flex items-center justify-center rounded-full hover:bg-surface-muted active:bg-surface-active transition-colors text-content-muted hover:text-content"
        aria-label="다음 포스터"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
};
