import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import type { BannerPosterProps } from './types';
import { resolveImageSrc } from '@/src/shared/utils/resolveImageSrc';

export const BannerPoster = ({
  src,
  alt = '포스터 이미지',
  width,
  height,
  className = '',
  children,
  isLoading = false,
  showGradient = true,
}: BannerPosterProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedSrc = resolveImageSrc(src);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedSrc]);
  
  // 수직 배너 형태 (사진과 같은 포스터 느낌을 위해 가로폭을 제한하고 세로를 길게)
  const defaultDimensions = (!width && !height) ? 'w-full max-w-[340px] md:max-w-[400px] h-[500px] md:h-[600px] mx-auto' : '';

  const inlineStyle: React.CSSProperties = {};

  if (width !== undefined) inlineStyle.width = width;
  if (height !== undefined) inlineStyle.height = height;

  if (isLoading) {
    return (
      <div
        className={`relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-gray-200 animate-pulse rounded-none md:rounded-2xl ${defaultDimensions} ${className}`}
        style={inlineStyle}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden shadow-lg ${defaultDimensions} ${className}`}
      style={inlineStyle}
    >
      {(!resolvedSrc || imgFailed) ? (
        <div className="w-full h-full bg-[#f2f4f6] flex flex-col items-center justify-center text-[#8B95A1]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold tracking-tight">준비중 입니다</span>
            <span className="flex gap-[3px] items-center mb-[2px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="animate-dot-bounce block"
                  style={{
                    width: '3.5px',
                    height: '3.5px',
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
          src={resolvedSrc}
          alt={alt}
          fill
          priority
          unoptimized={true}
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {/* 어두운 그라데이션 오버레이 (텍스트 가독성을 위해 하단을 더 어둡게) */}
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />
      )}

      {/* 내부 콘텐츠 (헤더, 타이틀 등) */}
      {children && (
        <div className="absolute inset-0 z-10 flex flex-col p-6 md:p-12">
          {children}
        </div>
      )}
    </div>
  );
};
