'use client';

import React, { useRef, useState, useEffect } from 'react';

interface InteractiveMapViewerProps {
  children: React.ReactNode;
  showZoomControls?: boolean;
}

export const InteractiveMapViewer = ({ children, showZoomControls = true }: InteractiveMapViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1); 
  const [minScale, setMinScale] = useState(0.1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  const fitContent = () => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (contentWidth === 0 || contentHeight === 0) return;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const fitScale = Math.min(scaleX, scaleY) * 0.95;
    
    setScale(fitScale);
    setMinScale(fitScale);
    setPosition({ x: 0, y: 0 });
  };

  // 컴포넌트 마운트 및 리사이즈 시 화면에 딱 맞게(최대로) 초기 배율 계산
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

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

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.3, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.3, minScale));
  const handleResetZoom = () => fitContent();

  const hasDragged = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 확대/축소 버튼 위에서 발생한 이벤트 무시
    if ((e.target as HTMLElement).closest('.zoom-controls')) return;

    isDragging.current = true;
    hasDragged.current = false;
    lastPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - lastPosition.current.x;
    const dy = e.clientY - lastPosition.current.y;
    
    // 일정 거리 이상 움직이면 드래그로 판정
    if (!hasDragged.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      hasDragged.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    
    if (hasDragged.current) {
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDragged.current = false;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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

      {showZoomControls && (
        <div className="zoom-controls absolute top-[80px] lg:top-auto lg:bottom-6 right-4 sm:right-6 flex flex-col bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg border border-gray-200/60 dark:border-zinc-700 overflow-hidden cursor-auto z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 active:bg-gray-100 transition-colors border-b border-gray-100 dark:border-zinc-700"
            aria-label="확대"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 active:bg-gray-100 transition-colors border-b border-gray-100 dark:border-zinc-700"
            aria-label="축소"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
            className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 active:bg-gray-100 transition-colors"
            aria-label="원래 크기로"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6"></path>
              <path d="M9 21H3v-6"></path>
              <path d="M21 3l-7 7"></path>
              <path d="M3 21l7-7"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
