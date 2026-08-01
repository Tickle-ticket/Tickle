import React, { useRef, useEffect } from 'react';
import type { StageProps } from './types';

export const Stage = ({
  label = 'STAGE',
  isLoading = false,
  className = '',
  width = 320,
  height = 56,
  ...props
}: StageProps & { width?: number; height?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isLoading) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Draw rounded rectangle background
    ctx.fillStyle = '#ced4da';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(0, 0, width, height, 12);
    } else {
      const radius = 12;
      ctx.moveTo(radius, 0);
      ctx.lineTo(width - radius, 0);
      ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, height - radius);
      ctx.quadraticCurveTo(width, height, width - radius, height);
      ctx.lineTo(radius, height);
      ctx.quadraticCurveTo(0, height, 0, height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
    }
    ctx.fill();

    // 2. Draw Text (STAGE)
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 20px Inter, sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Fallback letter-spacing if supported by browser canvas
    if ('letterSpacing' in ctx) {
       // letterSpacing은 Canvas 표준 타입에 아직 없는 실험적 속성이다.
       // 위에서 in 연산자로 지원 여부를 확인한 뒤에만 대입한다.
       (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px';
    }

    ctx.fillText(label, width / 2, height / 2);

  }, [label, width, height, isLoading]);

  if (isLoading) {
    return (
      <div 
        className={`bg-surface-active animate-pulse rounded-xl ${className}`}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas 
      ref={canvasRef}
      className={`block ${className}`}
      style={{ width, height }}
      {...props}
    />
  );
};
