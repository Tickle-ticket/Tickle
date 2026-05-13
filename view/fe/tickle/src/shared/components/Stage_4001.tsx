import React, { useEffect, useRef, useState, useMemo } from 'react';
import { drawSeat, getSeatColors } from './seatRenderer';
import { Stage } from './Stage';
import type { SeatColor, SeatStatus, CongestionLevel } from './types';

export interface Stage_4001_Props {
  seatsData?: Record<string, { color?: SeatColor; status?: SeatStatus; isSelected?: boolean; congestion?: CongestionLevel }>;
  onSeatClick?: (seatId: string, e: React.MouseEvent<HTMLCanvasElement>) => void;
  onSeatPointerDown?: (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  onSeatPointerEnter?: (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  onSeatPointerUp?: (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  className?: string;
}

const upperLeft = [
  ['A1', 'A2', 'A3', 'A4', 'A5'],
  ['B1', 'B2', 'B3', 'B4', 'B5'],
  ['C1', 'C2', 'C3', 'C4', 'C5'],
];

const upperRight = [
  ['A6', 'A7', 'A8', 'A9', 'A10'],
  ['B6', 'B7', 'B8', 'B9', 'B10'],
  ['C6', 'C7', 'C8', 'C9', 'C10'],
];

const lowerLeft = [
  ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
  ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'],
  ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'],
  ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'],
  ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'],
  ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'],
  ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7', 'J8'],
  ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'],
  ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'],
  ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'],
];

const lowerRight = [
  ['D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16'],
  ['E9', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15', 'E16'],
  ['F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16'],
  ['G9', 'G10', 'G11', 'G12', 'G13', 'G14', 'G15', 'G16'],
  ['H9', 'H10', 'H11', 'H12', 'H13', 'H14', 'H15', 'H16'],
  ['I9', 'I10', 'I11', 'I12', 'I13', 'I14', 'I15', 'I16'],
  ['J9', 'J10', 'J11', 'J12', 'J13', 'J14', 'J15', 'J16'],
  ['K9', 'K10', 'K11', 'K12', 'K13', 'K14', 'K15', 'K16'],
  ['L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
  ['M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'],
];

const seatSections = [upperLeft, upperRight, lowerLeft, lowerRight];
export const STAGE_4001_SEAT_IDS = seatSections.flatMap((section) =>
  section.flatMap((row) => row.filter((seatId): seatId is string => seatId !== null)),
);

interface SeatRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const Stage_4001 = ({
  seatsData = {},
  onSeatClick,
  onSeatPointerDown,
  onSeatPointerEnter,
  onSeatPointerUp,
  className = '',
}: Stage_4001_Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  const isDefaultMode = Object.keys(seatsData).length === 0;

  // 1. Layout 상수 설정
  const SEAT_W = 36;
  const SEAT_H = 42;
  const GAP_X = 6;
  const GAP_Y = 6;
  const ROW_HEADER_W = 24;
  const COL_HEADER_H = 20;

  // 2. 전체 Bounding Boxes 및 캔버스 크기 계산
  const { seatRects, labels, canvasWidth, canvasHeight } = useMemo(() => {
    const rects: SeatRect[] = [];
    const textLabels: { text: string; x: number; y: number; align: 'center' | 'right' }[] = [];

    const calcGrid = (grid: (string | null)[][]) => {
      let maxX = 0;
      let maxY = 0;
      const gRects: SeatRect[] = [];
      const gLabels: { text: string; x: number; y: number; align: 'center' | 'right' }[] = [];

      const maxCols = Math.max(...grid.map(row => row.length));

      // 열 헤더 계산
      for (let c = 0; c < maxCols; c++) {
        for (const row of grid) {
          if (row[c]) {
            const colNum = row[c]!.replace(/[a-zA-Z]/g, '');
            const x = ROW_HEADER_W + c * (SEAT_W + GAP_X) + SEAT_W / 2;
            const y = COL_HEADER_H - 4;
            gLabels.push({ text: colNum, x, y, align: 'center' });
            break;
          }
        }
      }

      // 행 및 좌석 계산
      grid.forEach((row, r) => {
        let rowLabel = '';
        for (const cell of row) {
          if (cell) {
            rowLabel = cell.replace(/[0-9]/g, '');
            break;
          }
        }

        const rowY = COL_HEADER_H + r * (SEAT_H + GAP_Y);
        gLabels.push({ text: rowLabel, x: ROW_HEADER_W - 4, y: rowY + SEAT_H / 2 + 4, align: 'right' });

        row.forEach((cellId, c) => {
          if (cellId) {
            const x = ROW_HEADER_W + c * (SEAT_W + GAP_X);
            const y = rowY;
            gRects.push({ id: cellId, x, y, width: SEAT_W, height: SEAT_H });
            maxX = Math.max(maxX, x + SEAT_W);
            maxY = Math.max(maxY, y + SEAT_H);
          }
        });
      });

      return { rects: gRects, labels: gLabels, w: maxX, h: maxY };
    };

    const ul = calcGrid(upperLeft);
    const ur = calcGrid(upperRight);
    const ll = calcGrid(lowerLeft);
    const lr = calcGrid(lowerRight);

    const upperWidth = ul.w + 48 + ur.w;
    const lowerWidth = ll.w + 40 + lr.w;

    const cW = Math.max(upperWidth, lowerWidth);

    // 중앙 정렬을 위한 오프셋
    const upperOffsetX = (cW - upperWidth) / 2;
    const lowerOffsetX = (cW - lowerWidth) / 2;

    const llStartY = Math.max(ul.h, ur.h) + 48;
    const cH = llStartY + Math.max(ll.h, lr.h);

    const applyOffset = (gridRes: any, dx: number, dy: number) => {
      gridRes.rects.forEach((r: any) => { r.x += dx; r.y += dy; rects.push(r); });
      gridRes.labels.forEach((l: any) => { l.x += dx; l.y += dy; textLabels.push(l); });
    };

    applyOffset(ul, upperOffsetX, 0);
    applyOffset(ur, upperOffsetX + ul.w + 48, 0);
    applyOffset(ll, lowerOffsetX, llStartY);
    applyOffset(lr, lowerOffsetX + ll.w + 40, llStartY);

    return { seatRects: rects, labels: textLabels, canvasWidth: cW, canvasHeight: cH };
  }, []);

  // 3. 메인 렌더링 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 텍스트 라벨 렌더링
      ctx.fillStyle = '#9ca3af'; // text-content-muted
      ctx.font = 'bold 12px sans-serif';
      labels.forEach(l => {
        ctx.textAlign = l.align;
        ctx.fillText(l.text, l.x, l.y);
      });

      // 좌석 렌더링
      seatRects.forEach(rect => {
        const data = seatsData[rect.id];
        const isMissingSeat = !isDefaultMode && !data;
        const status = isMissingSeat ? 'disabled' : (data?.status || 'selectable');
        const color = isMissingSeat ? 'gray' : (data?.color || 'gray');
        const congestion = isMissingSeat ? 'none' : (data?.congestion || 'none');
        const isSelected = data?.isSelected || false;

        const isHovered = hoveredSeat === rect.id;
        const colors = getSeatColors(status, color, isSelected);

        drawSeat({
          ctx,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          status,
          color,
          congestion,
          isSelected,
          colors,
          isHovered
        });
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasWidth, canvasHeight, seatRects, labels, seatsData, hoveredSeat, isDefaultMode]);

  // 4. 이벤트 핸들러 (Hit Detection)
  const getHitSeat = (e: React.MouseEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    // CSS Transform(Scale)이 적용되었을 때의 실제 렌더링 좌표 보정
    const scaleX = canvas.offsetWidth / rect.width;
    const scaleY = canvas.offsetHeight / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const seat of seatRects) {
      if (x >= seat.x && x <= seat.x + seat.width && y >= seat.y && y <= seat.y + seat.height) {
        return seat.id;
      }
    }
    return null;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = getHitSeat(e);

    if (hit !== hoveredSeat) {
      setHoveredSeat(hit);
      if (hit && onSeatPointerEnter) {
        onSeatPointerEnter(hit, e);
      }
    }
  };

  const handlePointerLeave = () => {
    setHoveredSeat(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onSeatPointerDown || !hoveredSeat) return;
    onSeatPointerDown(hoveredSeat, e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onSeatPointerUp || !hoveredSeat) return;
    onSeatPointerUp(hoveredSeat, e);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeatClick) return;
    const hit = getHitSeat(e);
    if (hit) {
      onSeatClick(hit, e);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-12 p-12 bg-surface rounded-2xl shadow-sm overflow-x-auto min-w-max ${className}`}>
      {/* 1. Stage Area */}
      <div className="flex flex-col items-center gap-3 w-full">
        <Stage width={480} height={72} label="무대" />
      </div>

      {/* 2. Unified Canvas for Seats */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={{ width: canvasWidth, height: canvasHeight, cursor: hoveredSeat ? 'pointer' : 'default' }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          className="touch-none"
        />
      </div>
    </div>
  );
};
