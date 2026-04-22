import React from 'react';
import type { TextProps } from './types';

// 토스(Toss) 스타일의 프리미엄 타이포그래피 (크기 및 기본 굵기)
const TYPOGRAPHY_MAP = {
  t1: 'text-[24px] leading-[34px] font-bold',
  t2: 'text-[22px] leading-[30px] font-bold',
  t3: 'text-[20px] leading-[28px] font-bold',
  t4: 'text-[18px] leading-[26px] font-medium',
  t5: 'text-[16px] leading-[24px] font-regular',
  t6: 'text-[14px] leading-[20px] font-regular',
  t7: 'text-[12px] leading-[18px] font-regular',
};

const COLOR_MAP = {
  primary: 'text-gray-900',     // 주요 제목 및 강조 글씨 (가장 진함)
  secondary: 'text-gray-600',   // 본문이나 보조 설명 영역
  tertiary: 'text-gray-400',    // 부가 설명, 중요도 낮은 텍스트 (가장 연함)
  blue: 'text-blue-500',        // 파란색 강조 (토스 블루)
  red: 'text-red-500',          // 에러/경고
  white: 'text-white',          // 어두운 UI 배경용
  gray: 'text-gray-500',        // 중간 톤 회색
};

const WEIGHT_MAP = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const ALIGN_MAP = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const Text = ({
  as: Component = 'span',
  typography = 't5',
  color = 'primary',
  fontWeight,     // 명시하지 않으면 typography의 시스템 기본 굵기를 따라감
  textAlign = 'left',
  ellipsis = false,
  className = '',
  children,
  ...props
}: TextProps) => {

  const combinedClasses = [
    TYPOGRAPHY_MAP[typography],
    COLOR_MAP[color],
    fontWeight ? WEIGHT_MAP[fontWeight] : '', // 유저가 외부에서 굵기 지정 시 강제 오버라이드
    ALIGN_MAP[textAlign],
    ellipsis ? 'truncate whitespace-nowrap overflow-hidden' : '', // 말줄임표 기능
    'tracking-[-0.01em]', // 디자인에 안착감을 주기 위한 살짝 좁은 자간 (토스 느낌)
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={combinedClasses} {...props}>
      {children}
    </Component>
  );
};
