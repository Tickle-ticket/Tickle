import React, { useState, useRef, ReactNode, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, animate } from 'framer-motion';
import { TicketIcon } from '@heroicons/react/24/outline';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export const PullToRefresh = ({ onRefresh, children, disabled = false }: PullToRefreshProps) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  // framer-motion values for buttery smooth animations
  const pullY = useMotionValue(0);
  const pillY = useTransform(pullY, [0, 60, 100], [-60, 24, 40]);
  const pillWidth = useTransform(pullY, [0, 60, 100], [40, 140, 150]);
  const pillOpacity = useTransform(pullY, [0, 30], [0, 1]);
  const iconRotate = useTransform(pullY, [0, 60], [0, 180]);
  const textOpacity = useTransform(pullY, [40, 60], [0, 1]);

  const MAX_PULL = 120;
  const THRESHOLD = 60;

  const lastScrollTop = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    
    // 50px 이내면 무조건 보이기
    if (currentScrollTop < 50) {
      window.dispatchEvent(new CustomEvent('tickle-scroll-up'));
    } else if (currentScrollTop > lastScrollTop.current + 10) {
      window.dispatchEvent(new CustomEvent('tickle-scroll-down'));
    } else if (currentScrollTop < lastScrollTop.current - 10) {
      window.dispatchEvent(new CustomEvent('tickle-scroll-up'));
    }
    
    lastScrollTop.current = currentScrollTop;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return; // 웹(데스크톱) 마우스 드래그 방지
    if (disabled || isRefreshing) return;
    const scrollTop = scrollRef.current?.scrollTop || 0;
    if (scrollTop <= 0) {
      pullStartY.current = e.clientY;
      setIsPulling(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const distance = e.clientY - pullStartY.current;

    if (distance > 0) {
      // Elastic resistance
      const pullDistance = distance < THRESHOLD 
        ? distance 
        : THRESHOLD + (distance - THRESHOLD) * 0.3;
        
      pullY.set(Math.min(pullDistance, MAX_PULL));
      controls.set({ y: pullY.get() });
      
      if (e.cancelable) e.preventDefault();
    } else {
      setIsPulling(false);
      pullY.set(0);
      controls.start({ y: 0, transition: { duration: 0.2 } });
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    setIsPulling(false);

    const currentY = pullY.get();

    if (currentY > THRESHOLD) {
      setIsRefreshing(true);
      
      // Lock pill at refreshing position
      animate(pullY, THRESHOLD, { type: 'spring', bounce: 0.3 });
      controls.start({ y: THRESHOLD, transition: { type: 'spring', bounce: 0.2 } });
      
      // Optional: tiny haptic feedback if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }

      await onRefresh();
      
      setIsRefreshing(false);
    }
    
    // Release and bounce back
    animate(pullY, 0, { type: 'spring', bounce: 0.2, duration: 0.5 });
    controls.start({ y: 0, transition: { type: 'spring', bounce: 0.2 } });
  };

  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isPulling && e.cancelable) e.preventDefault();
    };
    
    const node = scrollRef.current;
    if (node) {
      node.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      return () => node.removeEventListener('touchmove', handleGlobalTouchMove);
    }
  }, [isPulling]);

  // Determine State
  const isReady = pullY.get() >= THRESHOLD;

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col bg-transparent">
      {/* Dynamic Island Style Pill */}
      <motion.div 
        className="absolute left-1/2 flex items-center justify-center bg-slate-900/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden z-[60]"
        style={{
          y: pillY,
          x: '-50%',
          width: pillWidth,
          height: 40,
          opacity: pillOpacity,
        }}
      >
        <div className="relative flex items-center justify-center w-full h-full px-4">
          <motion.div 
            className="flex items-center gap-2"
            animate={isRefreshing ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1 }}
          >
            <motion.div
              style={{ rotate: isRefreshing ? 0 : iconRotate }}
              animate={isRefreshing ? { rotateY: 360 } : {}}
              transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1.2, ease: "linear" }}
              className={`flex-shrink-0 ${isReady || isRefreshing ? 'text-blue-400' : 'text-gray-300'}`}
            >
              <TicketIcon className="w-5 h-5" />
            </motion.div>
            
            <motion.span 
              className="text-xs font-bold text-white whitespace-nowrap"
              style={{ opacity: textOpacity }}
            >
              {isRefreshing ? '업데이트 중...' : isReady ? '놓아서 새로고침' : '새로운 공연 찾기'}
            </motion.span>
          </motion.div>

          {/* Glowing gradient background during refresh */}
          {isRefreshing && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          )}
        </div>
      </motion.div>

      {/* Scrollable Content */}
      <motion.div
        ref={scrollRef}
        animate={controls}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden scrollbar-hide z-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </motion.div>
    </div>
  );
};
