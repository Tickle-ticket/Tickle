import React, { useEffect, useRef } from 'react';

export interface SectionNavItem {
  id: string;
  title: string;
}

interface SectionNavProps {
  items: SectionNavItem[];
  activeIndex: number;
  onItemClick: (id: string, index: number) => void;
  className?: string;
  isLoading?: boolean;
}

export const SectionNav = ({
  items,
  activeIndex,
  onItemClick,
  className = '',
  isLoading = false
}: SectionNavProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 선택된 항목이 뷰포트 내에 보이도록 가로 스크롤 조정 (모바일 등 좁은 화면 대비)
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const activeButton = container.children[activeIndex] as HTMLElement;
    if (activeButton) {
      const containerWidth = container.offsetWidth;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;
      container.scrollTo({
        left: buttonLeft - containerWidth / 2 + buttonWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-4 py-3 px-4 bg-surface/80 backdrop-blur-md border border-line rounded-2xl shadow-sm overflow-x-auto scrollbar-hide ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-active rounded-xl animate-pulse w-24 h-11 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-surface-muted/80 backdrop-blur-lg rounded-2xl overflow-x-hidden ${className}`}
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id, index)}
            className={`
              relative flex flex-1 items-center justify-center py-2.5 sm:py-3 rounded-xl text-sm sm:text-[15px] font-extrabold transition-all duration-300
              ${isActive 
                ? 'text-white bg-[var(--toss-grey-700)] shadow-sm' 
                : 'text-content-tertiary hover:text-content hover:bg-black/5'
              }
            `}
          >
            {item.title}
          </button>
        );
      })}
    </div>
  );
};
