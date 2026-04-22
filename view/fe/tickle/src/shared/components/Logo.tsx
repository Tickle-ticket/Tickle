import React from 'react';
import type { LogoProps } from './types';

const sizeMap = {
  small: 'w-24 md:w-32',
  medium: 'w-36 md:w-48',
  large: 'w-48 md:w-64',
};

// SVG가 파일 형태일 경우 Tailwind의 CSS filter를 이용해 색상을 강제로 조정할 수 있습니다.
const variantFilter = {
  primary: '', // 원본 SVG 색상 그대로 유지
  white: 'brightness-0 invert', // 밝기 0(검정) -> 반전(흰색)
  black: 'brightness-0', // 밝기를 0으로 해서 완전 검정으로
};

export const Logo = ({ variant = 'primary', size = 'medium', className = '', onClick }: LogoProps) => {
  return (
    <div 
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${sizeMap[size]} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
    >
      {/* 
        public 폴더에 올려주신 tickle.svg 파일을 직접 불러옵니다.
        SVG 내부에 PNG 이미지가 박혀있는 아주 큰 파일(40KB)이므로, 
        성능과 번들 사이즈 최적화를 위해 코드를 넣지 않고 <img> 태그로 로드하는 것이 정석입니다.
      */}
      <img 
        src="/tickle.svg" 
        alt="Tickle Logo" 
        className={`w-full h-auto object-contain transition-all duration-300 ${variantFilter[variant]}`}
        draggable={false}
      />
    </div>
  );
};
