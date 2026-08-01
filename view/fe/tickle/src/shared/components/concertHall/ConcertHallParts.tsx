'use client';

/**
 * 공연장 좌석 배치도를 그리는 조각들입니다.
 *
 * <p>ConcertHallMockup이 602줄인데 그중 289줄이 이 조각들이었습니다. 좌석 하나,
 * 좌석 격자, 열 라벨, 휠체어석, 구역 이름처럼 각각 하나의 도형만 그리는
 * 함수들이라 배치도 본체와 섞여 있을 이유가 없습니다.</p>
 */

export type SeatTone = 'empty' | 'green' | 'purple' | 'blue' | 'orange';

export interface ConcertHallMockupProps {
  className?: string;
}

export const seatToneStyle: Record<SeatTone, { fill: string; stroke: string; strokeWidth: number }> = {
  empty: { fill: '#e8edf3', stroke: 'transparent', strokeWidth: 0 },
  green: { fill: '#b9f5b6', stroke: '#20aa38', strokeWidth: 2 },
  purple: { fill: '#e5e0ff', stroke: '#8072ff', strokeWidth: 2 },
  blue: { fill: '#c7f2ff', stroke: '#18aef5', strokeWidth: 2 },
  orange: { fill: '#ffe0d3', stroke: '#ff7b4f', strokeWidth: 2 },
};

export const seatKey = (row: number, col: number) => `${row}-${col}`;

export function Seat({
  cx,
  cy,
  tone = 'empty',
  radius = 6,
}: {
  cx: number;
  cy: number;
  tone?: SeatTone;
  radius?: number;
}) {
  const style = seatToneStyle[tone];

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
    />
  );
}

export function SeatGrid({
  x,
  y,
  rows,
  cols,
  gap = 17,
  radius = 6,
  tone = 'empty',
  colored = {},
  rowOffset,
  clip,
}: {
  x: number;
  y: number;
  rows: number;
  cols: number;
  gap?: number;
  radius?: number;
  tone?: SeatTone;
  colored?: Record<string, SeatTone>;
  rowOffset?: (row: number) => number;
  clip?: (row: number, col: number) => boolean;
}) {
  const seats = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (clip && !clip(row, col)) {
        continue;
      }

      seats.push(
        <Seat
          key={`${row}-${col}`}
          cx={x + (rowOffset?.(row) ?? 0) + col * gap}
          cy={y + row * gap}
          radius={radius}
          tone={colored[seatKey(row, col)] ?? tone}
        />,
      );
    }
  }

  return <g>{seats}</g>;
}

export function RowLabels({
  x,
  y,
  from,
  to,
  gap = 17,
}: {
  x: number;
  y: number;
  from: number;
  to: number;
  gap?: number;
}) {
  return (
    <g fill="#2f343b" fontSize="12" fontWeight="700" textAnchor="middle">
      {Array.from({ length: to - from + 1 }, (_, index) => (
        <text key={from + index} x={x} y={y + index * gap + 4}>
          {from + index}
        </text>
      ))}
    </g>
  );
}

export function WheelchairZone({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <text x={x - 16} y={y + 13} fill="#67707c" fontSize="21" fontWeight="900">
        ♿
      </text>
      <rect x={x} y={y} width="150" height="17" fill="#ffffff" stroke="#c8ced8" strokeWidth="1.5" rx="1" />
      {Array.from({ length: 9 }, (_, index) => (
        <Seat key={index} cx={x + 12 + index * 16} cy={y + 8.5} radius={6} />
      ))}
    </g>
  );
}

export function toColored(entries: Array<[number, number, SeatTone]>) {
  return entries.reduce<Record<string, SeatTone>>((acc, [row, col, tone]) => {
    acc[seatKey(row, col)] = tone;
    return acc;
  }, {});
}

export const topLeftColored = toColored([
  [1, 2, 'green'],
  [2, 1, 'green'],
  [8, 2, 'green'],
  [9, 2, 'green'],
  [10, 2, 'green'],
  [11, 0, 'green'],
  [11, 1, 'green'],
  [11, 2, 'green'],
  [11, 3, 'green'],
  [12, 0, 'green'],
  [12, 1, 'green'],
  [12, 2, 'green'],
  [12, 3, 'green'],
  [12, 4, 'green'],
  [13, 0, 'green'],
  [13, 1, 'green'],
  [13, 2, 'green'],
  [13, 3, 'green'],
  [13, 4, 'green'],
  [13, 5, 'green'],
  [14, 0, 'green'],
  [14, 1, 'green'],
  [14, 2, 'green'],
  [14, 3, 'green'],
  [14, 4, 'green'],
  [14, 5, 'green'],
  [15, 0, 'green'],
  [15, 1, 'green'],
  [15, 2, 'green'],
  [15, 3, 'green'],
  [15, 6, 'green'],
  [15, 7, 'green'],
  [15, 8, 'purple'],
  [15, 9, 'purple'],
  [16, 0, 'green'],
  [16, 1, 'green'],
  [16, 2, 'green'],
  [17, 0, 'green'],
  [17, 1, 'green'],
  [17, 2, 'green'],
  [17, 4, 'green'],
  [17, 5, 'green'],
  [17, 6, 'green'],
  [18, 0, 'green'],
  [18, 1, 'green'],
  [18, 2, 'green'],
  [18, 3, 'green'],
  [18, 4, 'green'],
  [18, 5, 'green'],
  [18, 6, 'green'],
  [19, 0, 'green'],
  [19, 1, 'green'],
  [19, 2, 'green'],
  [19, 3, 'green'],
  [19, 4, 'green'],
  [19, 5, 'green'],
  [19, 6, 'green'],
  [19, 8, 'purple'],
  [19, 9, 'purple'],
  [20, 0, 'green'],
  [20, 1, 'green'],
  [20, 2, 'green'],
  [20, 3, 'green'],
  [20, 4, 'green'],
  [20, 5, 'green'],
  [20, 6, 'green'],
  [21, 0, 'green'],
  [21, 1, 'green'],
  [21, 2, 'green'],
  [21, 3, 'green'],
  [21, 4, 'green'],
  [21, 5, 'green'],
  [21, 6, 'green'],
]);

export const topCenterColored = toColored([
  [10, 0, 'purple'],
  [10, 1, 'purple'],
  [10, 2, 'purple'],
  [21, 8, 'purple'],
  [21, 9, 'purple'],
  [21, 10, 'purple'],
  [21, 13, 'purple'],
  [21, 14, 'purple'],
  [21, 15, 'purple'],
]);

export const topRightColored = toColored([
  [5, 5, 'purple'],
  [9, 8, 'purple'],
  [10, 9, 'green'],
  [11, 9, 'green'],
  [12, 7, 'purple'],
  [12, 8, 'purple'],
  [14, 6, 'purple'],
  [14, 7, 'purple'],
  [14, 8, 'purple'],
  [15, 5, 'purple'],
  [15, 6, 'purple'],
  [15, 7, 'purple'],
  [15, 8, 'purple'],
  [16, 9, 'green'],
  [17, 9, 'green'],
  [18, 9, 'green'],
  [19, 0, 'purple'],
  [19, 9, 'green'],
  [20, 0, 'purple'],
  [20, 1, 'purple'],
  [20, 7, 'purple'],
  [20, 8, 'green'],
  [20, 9, 'green'],
  [21, 0, 'purple'],
  [21, 1, 'purple'],
  [21, 7, 'purple'],
  [21, 8, 'green'],
  [21, 9, 'green'],
  [8, 14, 'green'],
  [9, 14, 'green'],
  [10, 14, 'green'],
  [10, 16, 'green'],
  [10, 17, 'green'],
  [11, 14, 'green'],
  [11, 16, 'green'],
  [17, 13, 'green'],
  [17, 14, 'green'],
  [17, 15, 'green'],
  [17, 16, 'green'],
  [17, 17, 'green'],
  [18, 13, 'green'],
  [18, 14, 'green'],
  [18, 15, 'green'],
  [18, 16, 'green'],
  [18, 17, 'green'],
  [19, 13, 'green'],
  [19, 14, 'green'],
  [19, 15, 'green'],
  [19, 16, 'green'],
  [19, 17, 'green'],
  [20, 13, 'green'],
  [20, 14, 'green'],
  [20, 15, 'green'],
  [20, 16, 'green'],
  [20, 17, 'green'],
  [21, 13, 'green'],
  [21, 14, 'green'],
  [21, 15, 'green'],
  [21, 16, 'green'],
  [21, 17, 'green'],
]);

export function SectionLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fill="#676b73" fontSize="30" fontWeight="900">
      {label}
    </text>
  );
}

