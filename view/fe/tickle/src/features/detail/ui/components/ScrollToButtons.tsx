'use client';

import type { RefObject } from 'react';

/**
 * 스크롤할 대상을 찾습니다.
 *
 * <p>상세 화면은 단독 페이지로도, 홈 위의 오버레이로도 뜹니다. 오버레이일 때는
 * 자체 스크롤 컨테이너가 없어 바깥 main이나 window를 대신 움직여야 합니다.</p>
 */
const resolveScrollTarget = (scrollRef: RefObject<HTMLElement | null>) =>
  scrollRef.current ?? document.querySelector('main') ?? null;

/**
 * 화면 맨 위·아래로 보내는 떠 있는 버튼입니다.
 *
 * @param scrollRef 상세 화면의 스크롤 컨테이너. 없으면 main이나 window를 쓴다
 */
export const ScrollToButtons = ({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLElement | null>;
}) => {
  const scrollToTop = () => {
    const target = resolveScrollTarget(scrollRef);
    if (target) target.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const target = resolveScrollTarget(scrollRef);
    if (target) target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
    else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 flex flex-col gap-3 z-[100]">
      <button
        onClick={scrollToTop}
        className="w-12 h-12 flex items-center justify-center bg-surface/90 backdrop-blur-sm border border-line rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:bg-surface transition-all text-content-tertiary hover:text-primary group"
        aria-label="맨 위로"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-0.5 transition-transform"><polyline points="18 15 12 9 6 15"></polyline></svg>
      </button>
      <button
        onClick={scrollToBottom}
        className="w-12 h-12 flex items-center justify-center bg-surface/90 backdrop-blur-sm border border-line rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:bg-surface transition-all text-content-tertiary hover:text-primary group"
        aria-label="맨 아래로"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-y-0.5 transition-transform"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
    </div>
  );
};
