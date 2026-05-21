import React from 'react';
import type { DiscountInfo } from '@/src/shared/api/types/event.types';

export interface GradePrice {
  priceGrade: string;
  price: number;
  discountInfo?: DiscountInfo[];
}

export interface PriceLegendProps {
  prices: GradePrice[];
  viewMode?: 'grade' | 'congestion';
}

const GRADE_COLORS: Record<string, string> = {
  'VIP': 'bg-[var(--seat-vip-top)]',
  'R': 'bg-[var(--seat-r-top)]',
  'S': 'bg-[var(--seat-s-top)]',
  'A': 'bg-[var(--seat-a-top)]',
};

export const PriceLegend = ({ prices, viewMode = 'grade' }: PriceLegendProps) => {
  const isCongestionMode = viewMode === 'congestion';

  return (
    <div className="absolute top-[80px] lg:top-4 left-4 z-20 group">
      <button className="flex items-center gap-1.5 sm:gap-2 bg-surface/90 backdrop-blur-sm px-2.5 py-1.5 sm:px-4 sm:py-3 rounded-full shadow-lg text-xs sm:text-sm font-bold text-content border border-line hover:scale-105 transition-transform">
        {isCongestionMode ? '대기 혼잡도 안내' : '등급 별 가격'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-tertiary">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>
      
      {/* 가격 정보 팝오버 (Hover 시 표시) */}
      <div className="absolute top-full left-0 mt-3 w-64 p-4 bg-surface rounded-2xl shadow-xl border border-line-subtle opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform -translate-y-2 group-hover:translate-y-0">
        
        {!isCongestionMode && (
          <>
            <h4 className="text-sm font-extrabold text-content mb-3">등급 별 가격 안내</h4>
            <div className="flex flex-col gap-2 mb-4">
              {prices.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`block w-3 h-3 shrink-0 rounded-full ${GRADE_COLORS[item.priceGrade] || 'bg-[var(--seat-gray-top)]'}`}></span>
                    <span className="font-bold text-content-secondary">
                      {item.priceGrade.endsWith('석') ? item.priceGrade : `${item.priceGrade}석`}
                    </span>
                  </div>
                  <span className="font-bold">{item.price.toLocaleString()}원</span>
                </div>
              ))}
            </div>

            <div className="border-t border-line-subtle pt-3">
              <h4 className="text-xs font-bold text-content-tertiary mb-2">좌석 상태 안내</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="block w-3 h-3 shrink-0 rounded-full bg-[var(--seat-disabled-top)]"></span>
                  <span className="font-medium text-content-secondary">선택 불가 (예매 완료)</span>
                </div>
                <p className="text-[11px] text-content-tertiary mt-1 leading-snug">
                  * 예매 중과 취소표 대기 모두 비활성화된 좌석은 현재 누군가 선점 중(예약 대기 중)인 좌석입니다.
                </p>
              </div>
            </div>
          </>
        )}

        {isCongestionMode && (
          <div>
            <h4 className="text-sm font-extrabold text-content mb-3">대기 혼잡도 안내</h4>
            <div className="flex flex-col gap-1 px-1">
              <div className="w-full h-3 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 shadow-inner"></div>
              <div className="flex justify-between text-[11px] font-bold text-content-tertiary mt-1">
                <span>보통</span>
                <span>혼잡</span>
                <span>매우 혼잡</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
