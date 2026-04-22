'use client';

import React, { useRef, useState, useEffect } from 'react';

interface InteractiveMapViewerProps {
  children: React.ReactNode;
}

export const InteractiveMapViewer = ({ children }: InteractiveMapViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1); 
  const [minScale, setMinScale] = useState(0.1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  // 컴포넌트 마운트 및 리사이즈 시 화면에 딱 맞게(최대로) 초기 배율 계산
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const fitContent = () => {
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (contentWidth === 0 || contentHeight === 0) return;

      // 여백을 약간(95%) 둔 상태로 꽉 차게 계산
      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const fitScale = Math.min(scaleX, scaleY) * 0.95;
      
      setScale(fitScale);
      setMinScale(fitScale); // 축소 한계를 초기 꽉 찬 상태로 설정
      setPosition({ x: 0, y: 0 }); // 중앙 정렬
    };

    fitContent();

    const resizeObserver = new ResizeObserver(() => fitContent());
    resizeObserver.observe(container);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, []);

  // 줌인/줌아웃 로직 (마우스 위치 기준)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // 기본 스크롤 방지
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = -e.deltaY * 0.002;
      const scaleMultiplier = Math.exp(zoomFactor);

      setScale(prevScale => {
        let newScale = prevScale * scaleMultiplier;
        newScale = Math.max(minScale, Math.min(newScale, 3)); // minScale 이하로 안 줄어들게

        const actualMultiplier = newScale / prevScale;

        setPosition(prevPos => {
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          
          const mouseRelativeX = mouseX - cx;
          const mouseRelativeY = mouseY - cy;

          return {
            x: (prevPos.x - mouseRelativeX) * actualMultiplier + mouseRelativeX,
            y: (prevPos.y - mouseRelativeY) * actualMultiplier + mouseRelativeY
          };
        });

        return newScale;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [minScale]);

  const hasDragged = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    lastPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - lastPosition.current.x;
    const dy = e.clientY - lastPosition.current.y;
    
    // 일정 거리 이상 움직이면 드래그로 판정
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.current = true;
    }
    
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    isDragging.current = false;
  };

  // 캡처 페이즈에서 드래그 상태라면 클릭 이벤트를 차단 (좌석이 실수로 눌리는 것 방지)
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDragged.current = false; // 리셋
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full min-h-[60vh] overflow-hidden relative cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClickCapture={handleClickCapture}
    >
      <div 
        ref={contentRef}
        className="absolute top-1/2 left-1/2 origin-center"
        style={{ 
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
          willChange: 'transform'
        }}
      >
        {children}
      </div>
      
      {/* 줌 컨트롤 힌트 */}
      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm pointer-events-none">
        마우스 휠로 확대/축소 • 드래그하여 이동
      </div>
    </div>
  );
};
