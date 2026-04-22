import React from 'react';
import type { SegmentedControlProps } from './types';

export const SegmentedControl = ({
  options,
  value,
  onChange,
  columns,
  rows,
  size = 'medium',
  className = '',
  isLoading = false,
}: SegmentedControlProps) => {

  // 트랙의 패딩과 텍스트 사이즈
  const sizeClasses = {
    small: 'p-[2px] text-xs',
    medium: 'p-1 text-sm',
    large: 'p-1.5 text-base',
  };

  // 버튼 형태의 내부 여백
  const itemSizeClasses = {
    small: 'px-3 py-1',
    medium: 'px-4 py-2',
    large: 'px-6 py-2.5',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : (rows ? 'auto' : `repeat(${options.length}, minmax(0, 1fr))`),
    gridTemplateRows: rows ? `repeat(${rows}, minmax(0, 1fr))` : 'auto',
    gridAutoFlow: rows && !columns ? 'column' : 'row',
  };

  if (isLoading) {
    return (
      <div 
        className={`bg-[#F2F4F6] rounded-[10px] items-center text-center ${sizeClasses[size]} ${className}`}
        style={gridStyle}
        aria-hidden="true"
      >
        {options.map((_, idx) => (
          <div
            key={`skeleton-${idx}`}
            className={`relative flex items-center justify-center w-full h-full rounded-[8px] bg-transparent ${itemSizeClasses[size]}`}
          >
            <div className="w-10 h-4 bg-gray-300 dark:bg-gray-400 rounded-[4px] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`bg-[#F2F4F6] rounded-[10px] items-center text-center ${sizeClasses[size]} ${className}`}
      style={gridStyle}
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`
              relative flex items-center justify-center w-full h-full rounded-[8px] font-semibold transition-all duration-200 ease-in-out outline-none select-none
              ${itemSizeClasses[size]}
              ${isSelected 
                  ? 'bg-white text-[#3182f6] shadow-[0_1px_4px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.1)] z-10' 
                  : 'bg-transparent text-[#8b95a1] hover:text-[#505967] hover:bg-[#e4e8eb] z-0'}
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
