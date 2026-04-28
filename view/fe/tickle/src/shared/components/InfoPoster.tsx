import React, { useState } from 'react';
import Image from 'next/image';
import type { InfoPosterProps } from './types';

export const InfoPoster = ({
  src,
  alt = '정보 포스터',
  width,
  height,
  disabled = false,
  className = '',
  isLoading = false,
}: InfoPosterProps) => {
  const [imgFailed, setImgFailed] = useState(false);

  const inlineStyle: React.CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  // 높이가 주어지지 않는 이상, 무조건 2:3 세로 형태를 유지하여 찌그러지거나 사라지지 않게 방어
  const widthClass = width === undefined ? 'w-[240px] md:w-[280px]' : '';
  const aspectClass = height === undefined ? 'aspect-[2/3]' : '';
  const defaultDimensions = `${widthClass} ${aspectClass}`;

  if (isLoading) {
    return (
      <div 
        className={`relative overflow-hidden rounded-2xl shadow-md bg-gray-200 animate-pulse ${defaultDimensions} ${className}`}
        style={inlineStyle}
      />
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl shadow-md ${defaultDimensions} ${className}`}
      style={inlineStyle}
    >
      {(!src || imgFailed) ? (
        <div className={`absolute inset-0 w-full h-full bg-[#f2f4f6] flex flex-col items-center justify-center text-[#8B95A1] transition-all duration-300 ${disabled ? 'grayscale opacity-50' : 'grayscale-0 opacity-100'}`}>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-semibold tracking-tight">준비중 입니다</span>
            <span className="flex gap-[2.5px] items-center mb-[1px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="animate-dot-bounce block"
                  style={{
                    width: '2.5px',
                    height: '2.5px',
                    backgroundColor: 'currentColor',
                    borderRadius: '50%',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </span>
          </div>
        </div>
      ) : (
        <Image
          src={src} 
          alt={alt} 
          fill
          sizes="(max-width: 768px) 240px, 280px"
          className={`object-cover transition-all duration-300 ${disabled ? 'grayscale opacity-50' : 'grayscale-0 opacity-100'}`} 
          onError={() => setImgFailed(true)}
        />
      )}
      
      {/* 
        하단은 검정으로 가면서 그라데이션. 
        to-transparent를 위쪽으로 주어 하단일수록 어두워지게 함(bg-gradient-to-t) 
      */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
    </div>
  );
};
