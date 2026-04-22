import React from 'react';
import { Text } from './Text';
import type { TitleProps } from './types';

export const Title = ({
  title,
  leftIcon,
  onLeftClick,
  rightElement,
  transparent = false,
  bottomBorder = false,
  className = '',
}: TitleProps) => {
  const headerClasses = [
    'w-full',
    transparent ? 'bg-transparent' : 'bg-white',
    bottomBorder ? 'border-b border-gray-200' : '',
    'flex',
    'flex-col',
    className,
  ].filter(Boolean).join(' ');

  const renderLeftIcon = () => {
    if (leftIcon === 'back') {
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );
    }
    if (leftIcon === 'close') {
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    }
    return leftIcon;
  };

  return (
    <header className={headerClasses}>
      {/* 1. 상단 액션바 영역 (뒤로가기, 닫기 등 아이콘이 있을 때만 표출) */}
      {(leftIcon || rightElement) && (
        <div className="flex items-center justify-between h-[48px] px-2">
          <div className="flex items-center justify-start">
            {leftIcon && (
              <button
                type="button"
                onClick={onLeftClick}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none active:bg-gray-200"
                aria-label="이전(또는 닫기)"
              >
                {renderLeftIcon()}
              </button>
            )}
          </div>
          <div className="flex items-center justify-end px-2">
            {rightElement}
          </div>
        </div>
      )}

      {/* 2. 실제 굵고 큰 제목(Title) 영역 */}
      {title && (
        <div className="px-5 pt-4 pb-2">
          <Text as="h1" typography="t1" fontWeight="bold" color="primary" className="whitespace-pre-wrap">
            {title}
          </Text>
        </div>
      )}
    </header>
  );
};
