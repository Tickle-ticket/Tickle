import { useEffect, useRef } from 'react';

interface UseTargetTrackerProps {
  trackId: string;
  isClickable?: boolean;
}

/**
 * 봇/매크로 탐지를 위해 타겟 요소에 무부하(Zero-load) 트래킹 데이터를 수집하는 훅입니다.
 * React 상태(State) 대신 요소의 data-* 속성에 타임스탬프를 기록하여 렌더링 부하를 없앱니다.
 */
export const useTargetTracker = <T extends HTMLElement = any>({ trackId, isClickable = true }: UseTargetTrackerProps) => {
  const ref = useRef<T>(null);

  // 1. Mount 타임스탬프 기록 (immediate_post_render_click_rate 용도)
  useEffect(() => {
    if (ref.current && !ref.current.dataset.mountTs) {
      ref.current.dataset.mountTs = Date.now().toString();
      ref.current.dataset.trackId = trackId;
    }
  }, [trackId]);

  // 2. 가시성(Visible) 타임스탬프 기록 (Intersection Observer)
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && ref.current && !ref.current.dataset.visibleTs) {
        ref.current.dataset.visibleTs = Date.now().toString();
      }
    });
    
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // 3. 클릭 가능(Clickable) 활성화 타임스탬프 기록
  useEffect(() => {
    if (ref.current) {
      if (isClickable) {
        if (!ref.current.dataset.clickableTs) {
          ref.current.dataset.clickableTs = Date.now().toString();
        }
      } else {
        // 비활성화되면 초기화
        delete ref.current.dataset.clickableTs;
      }
    }
  }, [isClickable]);

  // 4. Hover 이벤트 핸들러 (mouse_hover_dwell_time_ms 용도)
  const onMouseEnter = () => {
    if (ref.current) {
      ref.current.dataset.hoverStartTs = Date.now().toString();
    }
  };

  const onMouseLeave = () => {
    if (ref.current) {
      delete ref.current.dataset.hoverStartTs;
    }
  };

  return {
    ref,
    onMouseEnter,
    onMouseLeave,
    'data-track-id': trackId,
  };
};
