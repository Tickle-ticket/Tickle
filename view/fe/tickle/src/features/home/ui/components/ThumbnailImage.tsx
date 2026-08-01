'use client';

import { useImageFallback } from '@/src/shared/hooks/useImageFallback';

/**
 * 배너 썸네일. 이미지가 없거나 실패하면 빈 배경으로 대체합니다.
 *
 * @param src 이미지 경로
 * @param alt 대체 텍스트
 */
export const ThumbnailImage = ({ src, alt }: { src: string; alt: string }) => {
  const { resolvedSrc, showFallback, onError } = useImageFallback(src);

  if (showFallback) {
    return <div className="w-full h-full bg-surface" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className="w-full h-full object-cover bg-surface"
      onError={onError}
    />
  );
};
