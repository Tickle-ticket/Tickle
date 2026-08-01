'use client';

import { useEffect, useState } from 'react';

/** sticky 헤더에 가리지 않도록 띄우는 여백. */
const STICKY_HEADER_OFFSET = 80;

/**
 * 스크롤 가능한 가장 가까운 조상을 찾습니다.
 *
 * <p>모바일에서는 PullToRefresh 같은 중첩 스크롤러가 껴 있어 window를 움직여도
 * 화면이 반응하지 않습니다. 실제로 스크롤되는 요소를 직접 찾아야 합니다.</p>
 */
const getScrollParent = (node: HTMLElement | null): HTMLElement => {
  if (!node) return document.documentElement;
  if (node.scrollHeight > node.clientHeight) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return getScrollParent(node.parentElement);
};

/**
 * 상세 화면의 섹션 탭을 스크롤 위치에 맞춰 표시하고, 탭을 누르면 그 섹션으로 옮깁니다.
 *
 * @param navItems 섹션 목록. id가 DOM 요소의 id와 같아야 한다
 * @param isReady  본문이 그려진 뒤에 관찰을 시작하려고 본다(보통 isLoading의 반대)
 * @return activeIndex 현재 보고 있는 섹션 · scrollToSection 탭 클릭 처리
 */
export const useSectionNav = (
  navItems: readonly { id: string }[],
  isReady: boolean,
) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = navItems.findIndex((item) => item.id === entry.target.id);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );

    navItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [navItems, isReady]);

  const scrollToSection = (id: string, index: number) => {
    setActiveIndex(index);

    const element = document.getElementById(id);
    if (!element) return;

    const scrollParent = getScrollParent(element);
    const isWindow = scrollParent === document.documentElement;

    const elementRect = element.getBoundingClientRect();
    const parentRect = isWindow ? { top: 0 } : scrollParent.getBoundingClientRect();
    const scrollTop = isWindow ? window.pageYOffset : scrollParent.scrollTop;
    const targetY = elementRect.top - parentRect.top + scrollTop - STICKY_HEADER_OFFSET;

    if (isWindow) {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    } else {
      scrollParent.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  return { activeIndex, scrollToSection };
};
