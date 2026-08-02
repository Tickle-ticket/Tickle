'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 가로 스크롤 캐러셀의 위치를 추적하고 좌우 이동을 제공합니다.
 *
 * <p>ref를 객체가 아니라 콜백(setNode)으로 받습니다. 요소가 붙는 시점을 알아야
 * 스크롤 리스너를 걸 수 있는데, ref 객체는 값이 바뀌어도 리렌더가 없어 그 시점을
 * 잡을 수 없습니다.</p>
 *
 * @return scrollRef 캐러셀 요소에 넘길 ref 콜백 · canScrollLeft/Right 이동 가능 여부 · scroll 이동 함수
 */
export const useCarouselScroll = () => {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > 4);
    const maxScroll = node.scrollWidth - node.clientWidth;
    setCanScrollRight(maxScroll > 0 && node.scrollLeft < maxScroll - 4);
  }, [node]);

  useEffect(() => {
    if (!node) return;
    // 초기 체크 + 스크롤 및 리사이즈 이벤트 리슨
    const timer = setTimeout(checkScroll, 100);
    node.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      node.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [node, checkScroll]);

  const scroll = useCallback(
    (dir: "left" | "right") => {
      if (!node) return;

      // scroll-snap이 걸려있을 때 100%를 이동하면 브라우저에 따라 제자리로 튕기는(snapping back) 버그가 있습니다.
      // 이를 방지하고 자연스럽게 이전/다음 카드로 넘어가도록 이동 거리를 80%로 조정합니다.
      const amount = node.clientWidth * 0.8;
      node.scrollBy({
        left: dir === "right" ? amount : -amount,
        behavior: "smooth",
      });
    },
    [node],
  );

  return { scrollRef: setNode, canScrollLeft, canScrollRight, scroll };
};
