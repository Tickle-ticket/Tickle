import { SeatColor, SeatStatus, CongestionLevel } from './types';

export interface DrawSeatOptions {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  status?: SeatStatus;
  color?: SeatColor;
  congestion?: CongestionLevel;
  isSelected?: boolean;
  colors: { top: string; side: string };
  isHovered?: boolean;
}

export const drawSeat = ({
  ctx,
  x,
  y,
  width,
  height,
  status = 'selectable',
  color = 'blue',
  congestion = 'none',
  isSelected = false,
  colors,
  isHovered = false,
}: DrawSeatOptions) => {
  const isSelectable = status === 'selectable';
  const effectiveIsSelected = isSelected;

  const maxOffset = 6;
  const offset = effectiveIsSelected ? 2 : maxOffset;
  const radius = 8;
  const padding = 4;

  const drawRoundRect = (rx: number, ry: number, rw: number, rh: number, rr: number) => {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, rw, rh, rr);
    } else {
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx.lineTo(rx + rw, ry + rh - rr);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
      ctx.lineTo(rx, ry + rr);
      ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    }
  };

  const rectW = width - padding * 2;
  const rectH = height - padding * 2 - maxOffset;

  // 호버 효과: 그려지는 Y 위치를 약간 올림 (크기 조절 대신 물리 엔진처럼 위로 뜨는 효과)
  const hoverOffset = isHovered && isSelectable && !effectiveIsSelected ? -2 : 0;
  
  const baseY = y + padding + maxOffset + hoverOffset;
  const topY = y + padding + (maxOffset - offset) + hoverOffset;

  // 비활성화 좌석 처리 (투명도, 단 선택된 좌석은 제외)
  if (!isSelectable && !effectiveIsSelected) {
    ctx.globalAlpha = 0.5;
  }

  // 하단 기둥 본체 (입체감용 어두운 면)
  ctx.fillStyle = colors.side;
  drawRoundRect(x + padding, baseY, rectW, rectH, radius);
  ctx.fill();

  // 상판 기둥 옆면을 부드럽게 이어주기 위해 기둥 몸체 상단 여백 채움
  if (!effectiveIsSelected) {
    ctx.fillStyle = colors.side;
    ctx.fillRect(x + padding, baseY - maxOffset + radius, rectW, maxOffset);
  }

  // 상판
  // 호버 시 색상을 약간 밝게 하려면 여기서 globalAlpha를 조정할 수도 있지만 CSS로 제어하는 편이 나음
  ctx.fillStyle = colors.top;
  if (isHovered && isSelectable && !effectiveIsSelected) {
    // 호버 시 상판을 약간 밝게 표현하기 위해 덧칠
    drawRoundRect(x + padding, topY, rectW, rectH, radius);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  }
  
  drawRoundRect(x + padding, topY, rectW, rectH, radius);
  ctx.fill();

  // 선택된 좌석 중앙 흰색 점
  if (effectiveIsSelected) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + width / 2, topY + rectH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0; // 투명도 초기화
};

// CSS 변수에서 색상을 미리 캐싱해두는 유틸리티
let colorCache: Record<string, { top: string; side: string }> | null = null;

export const getSeatColors = (status: SeatStatus, color: SeatColor, isSelected: boolean) => {
  if (typeof document === 'undefined') return { top: '#60a5fa', side: '#3b82f6' };

  if (!colorCache) {
    colorCache = {};
    const rootStyle = getComputedStyle(document.documentElement);
    const keys = ['selected', 'disabled', 'vip', 'r', 's', 'a', 'b', 'c', 'red', 'blue', 'pink', 'yellow', 'mint', 'green', 'purple', 'gray', 'orange', 'cyan', 'high', 'medium', 'low'];
    
    keys.forEach(key => {
      colorCache![key] = {
        top: rootStyle.getPropertyValue(`--seat-${key}-top`).trim() || '#60a5fa',
        side: rootStyle.getPropertyValue(`--seat-${key}-side`).trim() || '#3b82f6'
      };
    });
  }

  const activeColorKey = isSelected
    ? 'selected'
    : status !== 'selectable'
      ? 'disabled'
      : color || 'blue';

  return colorCache[activeColorKey] || { top: '#60a5fa', side: '#3b82f6' };
};
