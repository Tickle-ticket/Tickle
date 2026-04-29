"use client";
import React, { useRef, useEffect } from 'react';
import type { SeatProps } from './types';
import { drawSeat, getSeatColors } from './seatRenderer';

export const Seat = ({
  status = 'selectable',
  color = 'blue',
  congestion = 'none',
  isSelected = false,
  isLoading = false,
  className = '',
  width = 36,
  height = 42, // 전체 캔버스 높이 (3D 그림자 오프셋 포함)
  style,
  ...props
}: SeatProps & { width?: number; height?: number }) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isLoading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // 디스플레이 픽셀 비율에 맞춰 캔버스 해상도 조정
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const isSelectable = status === 'selectable';
    // 비활성화(disabled) 상태라면 설정으로 강제라도 눌리지 않도록 예외처리
    const effectiveIsSelected = isSelectable && isSelected;

    const colors = getSeatColors(status, color || 'blue', effectiveIsSelected);

    drawSeat({
      ctx,
      x: 0,
      y: 0,
      width,
      height,
      status,
      color,
      congestion,
      isSelected: effectiveIsSelected,
      colors,
      isHovered: false, // 호버 애니메이션은 CSS scale-105로 처리하므로 false 유지
    });
  }, [status, color, congestion, isSelected, isLoading, width, height]);

  if (isLoading) {
    return (
      <div
        className={`bg-gray-200 animate-pulse rounded-md ${className}`}
        style={{ width, height, ...style }}
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`block cursor-pointer transition-transform hover:scale-105 active:scale-95 ${!isSelected && status === 'disabled' ? 'cursor-not-allowed opacity-80' : ''} ${className}`}
      style={{ width, height, ...style }}
      {...props}
      onClick={(e) => {
        if (props.onClick) props.onClick(e);
      }}
    />
  );
};
