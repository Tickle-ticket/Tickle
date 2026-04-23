import React from 'react';

export interface GradePrice {
  grade: string;
  price: number;
}

export interface PriceLegendProps {
  prices: GradePrice[];
}

const GRADE_COLORS: Record<string, string> = {
  'VIP': 'bg-[var(--seat-vip-top)]',
  'R': 'bg-[var(--seat-r-top)]',
  'S': 'bg-[var(--seat-s-top)]',
  'A': 'bg-[var(--seat-a-top)]',
};

export const PriceLegend = ({ prices }: PriceLegendProps) => {
  return (
    <div className="absolute top-4 left-4 z-20 group">
      <button className="flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-3 rounded-full shadow-lg text-sm font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 hover:scale-105 transition-transform">
        등급 별 가격
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>
      
      {/* 가격 정보 팝오버 (Hover 시 표시) */}
      <div className="absolute top-full left-0 mt-3 w-56 p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform -translate-y-2 group-hover:translate-y-0">
        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mb-3">등급 별 가격 안내</h4>
        <div className="flex flex-col gap-2">
          {prices.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className={`block w-3 h-3 shrink-0 rounded-full ${GRADE_COLORS[item.grade] || 'bg-[var(--seat-gray-top)]'}`}></span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{item.grade}</span>
              </div>
              <span className="font-bold">{item.price.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
