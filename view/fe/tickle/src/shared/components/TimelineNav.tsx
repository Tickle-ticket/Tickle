import React from 'react';
import type { TimelineNavProps } from './types';

export const TimelineNav = ({ 
  items, 
  activeIndex, 
  onItemClick, 
  color = 'black',
  size = 'medium',
  lineStyle = 'solid',
  className = '', 
  isLoading = false 
}: TimelineNavProps) => {
  if (isLoading) {
    return (
      <div className={`flex flex-col gap-8 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={`bg-gray-200 dark:bg-zinc-800 rounded animate-pulse ${size === 'small' ? 'w-20 h-4' : 'w-24 h-5'}`} />
        ))}
      </div>
    );
  }

  const colorStyles = {
    black: { activeText: 'text-black dark:text-white', activeDot: 'bg-black dark:bg-white border-[#f8f8f8] dark:border-zinc-950', hoverText: 'hover:text-black dark:hover:text-white', hoverDot: 'group-hover:bg-black dark:group-hover:bg-white' },
    blue: { activeText: 'text-blue-600 dark:text-blue-400', activeDot: 'bg-blue-600 dark:bg-blue-400 border-white dark:border-zinc-950', hoverText: 'hover:text-blue-600 dark:hover:text-blue-400', hoverDot: 'group-hover:bg-blue-600 dark:group-hover:bg-blue-400' },
    primary: { activeText: 'text-primary', activeDot: 'bg-primary border-white dark:border-zinc-950', hoverText: 'hover:text-primary', hoverDot: 'group-hover:bg-primary' },
  };

  const sizeStyles = {
    small: { text: 'text-xs', gap: 'gap-6', dotWrapper: 'w-[8px]', activeDot: 'w-[8px] h-[8px] border-[2px]', inactiveDot: 'w-1 h-1', lineLeft: 'left-[11px]' },
    medium: { text: 'text-sm', gap: 'gap-8', dotWrapper: 'w-[10px]', activeDot: 'w-[10px] h-[10px] border-[3px]', inactiveDot: 'w-1.5 h-1.5', lineLeft: 'left-[13px]' },
  };

  const currentColors = colorStyles[color];
  const currentSizes = sizeStyles[size];

  return (
    <div className={`relative flex flex-col ${currentSizes.gap} ${currentSizes.text} font-medium text-zinc-500 dark:text-zinc-400 pl-2 ${className}`}>
      {/* 세로선을 모든 점들의 중앙을 완벽하게 관통하도록 배치 */}
      <div className={`absolute ${currentSizes.lineLeft} top-[10px] bottom-[10px] w-[1px] bg-black/10 dark:bg-white/10 z-0 ${lineStyle === 'dashed' ? 'border-l border-dashed border-black/20 dark:border-white/20 bg-transparent' : ''}`}></div>

      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => onItemClick(item.id, index)}
          className={`relative flex items-center gap-3 w-full text-left ${currentColors.hoverText} transition-colors cursor-pointer group z-10`}
        >
          <div className={`${currentSizes.dotWrapper} flex justify-center items-center shrink-0`}>
            <span className={`rounded-full transition-all shadow-sm ${index === activeIndex
              ? `${currentSizes.activeDot} ${currentColors.activeDot}`
              : `${currentSizes.inactiveDot} bg-zinc-300 dark:bg-zinc-700 ${currentColors.hoverDot}`
              }`}></span>
          </div>
          <span className={`transition-colors ${index === activeIndex ? `${currentColors.activeText} font-bold` : ''}`}>
            {item.title}
          </span>
        </button>
      ))}
    </div>
  );
};
