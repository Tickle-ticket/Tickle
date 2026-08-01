'use client';

import { useState } from 'react';
import { resolveImageSrc } from '@/src/shared/utils/resolveImageSrc';

/**
 * 이미지 로드 실패를 추적하고, src가 바뀌면 다시 시도하게 합니다.
 *
 * <p>세 컴포넌트(Avatar·InfoPoster·BannerPoster)가 같은 로직을 각자 갖고
 * 있었습니다. 모두 effect에서 setState로 초기화하고 있었는데, 그러면 src가 바뀔
 * 때마다 렌더 → effect → 리렌더로 한 번 더 그려집니다.</p>
 *
 * <p>여기서는 렌더 중에 이전 src와 비교해 즉시 초기화합니다. React가 공식적으로
 * 권하는 "props가 바뀔 때 state 조정" 패턴이며, 추가 렌더가 생기지 않습니다.</p>
 *
 * @param src 원본 이미지 경로. 없거나 공백이면 폴백으로 본다
 * @return resolvedSrc 정리된 경로 · showFallback 대체 UI를 그릴지 · onError 실패 핸들러
 */
export const useImageFallback = (src?: string | null) => {
  const resolvedSrc = resolveImageSrc(src);

  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // 실패로 기록해둔 경로와 지금 경로가 다르면, 새 이미지는 아직 시도한 적이 없다.
  // effect로 미루지 않고 렌더에서 바로 판단하므로 리렌더가 한 번 줄어든다.
  const hasFailed = failedSrc !== null && failedSrc === resolvedSrc;

  return {
    resolvedSrc,
    showFallback: !resolvedSrc || hasFailed,
    /** <Image onError={...}>에 그대로 넘긴다. */
    onError: () => setFailedSrc(resolvedSrc),
  };
};
