"use client";
import React, { useRef, useEffect } from 'react';
import type { SeatProps } from './types';

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

    // 비활성화, 렌더링 컬러 결정
    const activeColorKey = !isSelectable
      ? 'disabled'
      : effectiveIsSelected
        ? 'selected'
        : color || 'blue';

    // Global CSS에 정의된 색상 변수를 가져옵니다. 
    // Fallback 색상을 지정하여 변수가 없더라도 기본값을 보장합니다.
    const rootStyle = getComputedStyle(document.documentElement);
    const colors = {
      top: rootStyle.getPropertyValue(`--seat-${activeColorKey}-top`).trim() || '#60a5fa',
      side: rootStyle.getPropertyValue(`--seat-${activeColorKey}-side`).trim() || '#3b82f6'
    };

    // 선택 시 마치 버튼이 눌린 것처럼 기둥 높이가 낮아짐 (단, 비활성화면 절대 안 눌림)
    const maxOffset = 6;
    const offset = effectiveIsSelected ? 2 : maxOffset;
    const radius = 8; // "끝은 동그랗게" 처리하기 위한 둥근 모서리 반경
    const padding = 4; // 바깥쪽 혼잡도 테두리를 위한 여백 확보 (기존 2 -> 4)

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
    };

    const rectW = width - padding * 2;
    const rectH = height - padding * 2 - maxOffset;

    // 하단 기둥 본체 (입체감용 어두운 면)
    ctx.fillStyle = colors.side;
    drawRoundRect(padding, padding + maxOffset, rectW, rectH, radius);
    ctx.fill();

    // 상판
    const topY = padding + (maxOffset - offset);

    // 기둥 옆면을 부드럽게 이어주기 위해 상판을 그리기 전에 기둥 몸체를 채움
    if (!effectiveIsSelected) {
      ctx.fillStyle = colors.side;
      ctx.fillRect(padding, padding + radius, rectW, maxOffset);
    }

    ctx.fillStyle = colors.top;
    drawRoundRect(padding, topY, rectW, rectH, radius);
    ctx.fill();

    // 혼잡도 테두리 추가 (좌석 바깥쪽으로 헤일로 형태로 감싸기)
    if (congestion && congestion !== 'none') {
      const congestionColors = {
        red: '#ef4444',     // 매우 혼잡
        yellow: '#eab308',  // 혼잡
        green: '#22c55e',   // 보통
        blue: '#3b82f6',    // 여유
      };
      
      const gap = 2; // 좌석과 혼잡도 테두리 사이의 간격
      ctx.strokeStyle = congestionColors[congestion];
      ctx.lineWidth = 2; // 테두리 두께
      
      // 전체 3D 좌석의 Bounding Box를 감싸도록 그림
      drawRoundRect(
        padding - gap, 
        topY - gap, 
        rectW + gap * 2, 
        rectH + (effectiveIsSelected ? offset : maxOffset) + gap * 2, 
        radius + 1
      );
      ctx.stroke();
    }

    // 선택된 좌석에 십자/체크/가운데 점 등 시각적 하이라이트 (가운데 큰 흰색 점)
    if (effectiveIsSelected) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(width / 2, topY + rectH / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

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
    />
  );
};
