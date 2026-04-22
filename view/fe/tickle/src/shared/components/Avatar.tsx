import React, { useState } from 'react';
import type { AvatarProps } from './types';

const SIZE_MAP = {
  small: 32,
  medium: 48,
  large: 64,
  xlarge: 80,
};

export const Avatar = ({
  src,
  alt = '프로필 이미지',
  size = 'medium',
  isLoading = false,
  className = '',
}: AvatarProps) => {
  const [imgFailed, setImgFailed] = useState(false);

  // size가 문자열(s, m, l)이면 지정된 픽셀로 변환하고, 숫자면 그대로 사용
  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size];

  // 로딩 상태일 때는 스켈레톤(원형) 표시
  if (isLoading) {
    return (
      <div
        className={`bg-gray-200 animate-pulse rounded-full flex-shrink-0 ${className}`}
        style={{ width: numericSize, height: numericSize }}
        aria-hidden="true"
      />
    );
  }

  // 넘겨받은 src가 아예 없거나, src 이미지를 로드하다 실패(404 등)하면 기본 아이콘 노출
  const showFallback = !src || imgFailed;

  return (
    <div
      className={`relative rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: numericSize, height: numericSize }}
    >
      {showFallback ? (
        /* 토스(Toss) 스타일과 아까 넘겨주신 이미지에 완벽히 호환되는 기본 프로필 SVG */
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* 부드러운 파스텔톤 연파랑 배경 */}
          <circle cx="50" cy="50" r="50" fill="#a4c8ff" />
          
          {/* 사람 얼굴 */}
          <circle cx="50" cy="38" r="17" fill="#3b82f6" />
          
          {/* 사람 몸통 */}
          <path
            d="M50 60C35 60 23 69.5 23 82V83.5A49.8 49.8 0 0077 83.5V82C77 69.5 65 60 50 60Z"
            fill="#3b82f6"
          />
        </svg>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
};
