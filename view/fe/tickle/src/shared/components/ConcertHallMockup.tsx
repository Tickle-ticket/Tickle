'use client';

type SeatTone = 'empty' | 'green' | 'purple' | 'blue' | 'orange';

export interface ConcertHallMockupProps {
  className?: string;
}

const seatToneStyle: Record<SeatTone, { fill: string; stroke: string; strokeWidth: number }> = {
  empty: { fill: '#e8edf3', stroke: 'transparent', strokeWidth: 0 },
  green: { fill: '#b9f5b6', stroke: '#20aa38', strokeWidth: 2 },
  purple: { fill: '#e5e0ff', stroke: '#8072ff', strokeWidth: 2 },
  blue: { fill: '#c7f2ff', stroke: '#18aef5', strokeWidth: 2 },
  orange: { fill: '#ffe0d3', stroke: '#ff7b4f', strokeWidth: 2 },
};

const seatKey = (row: number, col: number) => `${row}-${col}`;

function Seat({
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

function SeatGrid({
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

function RowLabels({
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

function WheelchairZone({ x, y }: { x: number; y: number }) {
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

function toColored(entries: Array<[number, number, SeatTone]>) {
  return entries.reduce<Record<string, SeatTone>>((acc, [row, col, tone]) => {
    acc[seatKey(row, col)] = tone;
    return acc;
  }, {});
}

const topLeftColored = toColored([
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

const topCenterColored = toColored([
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

const topRightColored = toColored([
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

function SectionLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fill="#676b73" fontSize="30" fontWeight="900">
      {label}
    </text>
  );
}

export function ConcertHallMockup({ className = '' }: ConcertHallMockupProps) {
  return (
    <div className={`w-full overflow-x-auto rounded-lg bg-[#eef1f5] p-4 ${className}`}>
      <svg
        viewBox="0 0 1040 1140"
        role="img"
        aria-label="공연장 좌석 목업"
        className="mx-auto block min-w-[920px] max-w-[1040px]"
      >
        <rect width="1040" height="1140" fill="#eef1f5" />

        <rect x="300" y="24" width="465" height="115" rx="12" fill="#c7cdd8" />
        <text x="532" y="94" textAnchor="middle" fill="#ffffff" fontSize="34" fontWeight="900">
          STAGE
        </text>

        <path
          d="M50 232 L150 154 L910 154 L1010 232 L1010 655 Q530 690 50 655 Z"
          fill="#ffffff"
        />

        <SeatGrid
          x={124}
          y={194}
          rows={7}
          cols={12}
          gap={18}
          colored={topLeftColored}
          rowOffset={(row) => Math.max(0, 5 - row) * -18}
        />
        <RowLabels x={365} y={194} from={1} to={7} />
        <SeatGrid x={385} y={194} rows={7} cols={16} gap={18} colored={topCenterColored} />
        <RowLabels x={700} y={194} from={1} to={7} />
        <SeatGrid
          x={720}
          y={194}
          rows={7}
          cols={12}
          gap={18}
          colored={topRightColored}
          rowOffset={(row) => Math.max(0, 5 - row) * 18}
        />

        <SeatGrid
          x={90}
          y={342}
          rows={14}
          cols={15}
          gap={18}
          colored={topLeftColored}
          clip={(row, col) => col < 15 - Math.max(0, row - 9)}
        />
        <RowLabels x={365} y={342} from={8} to={22} />
        <SeatGrid x={385} y={342} rows={15} cols={16} gap={18} colored={topCenterColored} />
        <RowLabels x={700} y={342} from={8} to={22} />
        <SeatGrid
          x={720}
          y={342}
          rows={15}
          cols={18}
          gap={18}
          colored={topRightColored}
          clip={(row, col) => col >= Math.max(0, 9 - row) || row < 8}
        />

        <WheelchairZone x={98} y={632} />
        <WheelchairZone x={820} y={632} />
        <text x={262} y={646} fill="#2f343b" fontSize="12" fontWeight="700">
          23
        </text>
        <text x={776} y={646} fill="#2f343b" fontSize="12" fontWeight="700">
          23
        </text>

        <SectionLabel x={532} y={705} label="1F" />

        <path d="M50 704 Q530 735 1010 704 L1010 918 Q530 952 50 918 Z" fill="#ffffff" />
        <SeatGrid
          x={86}
          y={742}
          rows={5}
          cols={15}
          gap={18}
          tone="green"
          colored={toColored([
            [0, 7, 'purple'],
            [0, 8, 'purple'],
            [0, 9, 'purple'],
            [0, 10, 'purple'],
            [0, 11, 'purple'],
            [0, 12, 'purple'],
            [1, 7, 'purple'],
            [1, 8, 'purple'],
            [1, 9, 'purple'],
            [1, 10, 'purple'],
            [1, 11, 'purple'],
            [1, 12, 'purple'],
            [2, 8, 'purple'],
            [2, 9, 'purple'],
            [2, 10, 'purple'],
            [2, 11, 'purple'],
            [2, 12, 'purple'],
            [2, 13, 'purple'],
            [2, 14, 'purple'],
          ])}
        />
        <SeatGrid
          x={122}
          y={830}
          rows={4}
          cols={12}
          gap={18}
          tone="empty"
          colored={toColored([
            [0, 5, 'blue'],
            [0, 6, 'blue'],
            [0, 7, 'blue'],
            [0, 14, 'blue'],
            [1, 3, 'blue'],
            [1, 4, 'blue'],
            [1, 5, 'blue'],
            [1, 6, 'blue'],
            [1, 7, 'blue'],
            [2, 1, 'blue'],
            [2, 2, 'blue'],
            [2, 3, 'blue'],
            [2, 4, 'blue'],
            [2, 5, 'blue'],
            [2, 6, 'blue'],
            [2, 7, 'blue'],
            [2, 8, 'blue'],
            [2, 9, 'blue'],
            [3, 0, 'blue'],
            [3, 1, 'blue'],
            [3, 2, 'blue'],
            [3, 3, 'blue'],
            [3, 4, 'blue'],
            [3, 5, 'blue'],
            [3, 6, 'blue'],
            [3, 7, 'blue'],
          ])}
        />

        <RowLabels x={363} y={742} from={1} to={10} />
        <line x1="388" y1="834" x2="388" y2="918" stroke="#9da5b1" strokeWidth="1" />
        <text x={386} y={930} textAnchor="middle" fill="#555" fontSize="9">
          통로없음
        </text>
        <SeatGrid
          x={385}
          y={742}
          rows={10}
          cols={16}
          gap={18}
          colored={toColored([
            [2, 1, 'purple'],
            [2, 2, 'purple'],
            [2, 3, 'purple'],
            [2, 4, 'purple'],
            [2, 5, 'purple'],
            [2, 6, 'purple'],
            [2, 13, 'purple'],
            [8, 10, 'blue'],
          ])}
          clip={(row, col) => !(row > 5 && col < 2)}
        />
        <RowLabels x={685} y={742} from={1} to={10} />
        <line x1="670" y1="834" x2="670" y2="918" stroke="#9da5b1" strokeWidth="1" />
        <text x={670} y={930} textAnchor="middle" fill="#555" fontSize="9">
          통로없음
        </text>

        <SeatGrid
          x={712}
          y={742}
          rows={5}
          cols={15}
          gap={18}
          tone="green"
          colored={toColored([
            [0, 4, 'purple'],
            [0, 5, 'purple'],
            [1, 2, 'purple'],
            [1, 3, 'purple'],
            [1, 4, 'purple'],
            [1, 5, 'purple'],
            [1, 6, 'purple'],
            [1, 7, 'purple'],
            [2, 0, 'purple'],
            [2, 1, 'purple'],
            [2, 2, 'purple'],
            [2, 3, 'purple'],
            [2, 4, 'purple'],
            [2, 5, 'purple'],
            [2, 6, 'purple'],
            [2, 7, 'purple'],
            [2, 8, 'purple'],
          ])}
        />
        <SeatGrid
          x={748}
          y={830}
          rows={4}
          cols={12}
          gap={18}
          colored={toColored([
            [0, 5, 'blue'],
            [0, 6, 'blue'],
            [0, 7, 'blue'],
            [0, 8, 'blue'],
            [0, 9, 'blue'],
            [1, 4, 'blue'],
            [1, 5, 'blue'],
            [1, 6, 'blue'],
            [1, 7, 'blue'],
            [1, 8, 'blue'],
            [1, 9, 'blue'],
            [2, 4, 'blue'],
            [2, 5, 'blue'],
            [2, 6, 'blue'],
            [2, 7, 'blue'],
            [2, 8, 'blue'],
            [2, 9, 'blue'],
            [2, 10, 'blue'],
            [3, 1, 'blue'],
            [3, 2, 'blue'],
            [3, 3, 'blue'],
            [3, 4, 'blue'],
            [3, 5, 'blue'],
            [3, 6, 'blue'],
            [3, 7, 'blue'],
            [3, 8, 'blue'],
            [3, 9, 'blue'],
            [3, 10, 'blue'],
            [3, 11, 'blue'],
          ])}
        />

        <SectionLabel x={532} y={955} label="2F" />

        <path d="M50 946 Q530 970 1010 946 L1010 1102 Q530 1124 50 1102 Z" fill="#ffffff" />
        <SeatGrid
          x={86}
          y={980}
          rows={6}
          cols={15}
          gap={18}
          colored={toColored(
            Array.from({ length: 15 }, (_, col) => [5, col, 'orange'] as [number, number, SeatTone])
              .concat(Array.from({ length: 13 }, (_, col) => [4, col, 'orange'] as [number, number, SeatTone]))
              .concat(Array.from({ length: 10 }, (_, col) => [3, col + 3, 'orange'] as [number, number, SeatTone]))
              .concat(Array.from({ length: 12 }, (_, col) => [1, col, 'orange'] as [number, number, SeatTone]))
              .concat(Array.from({ length: 4 }, (_, col) => [0, col, 'orange'] as [number, number, SeatTone])),
          )}
        />
        <RowLabels x={365} y={980} from={1} to={6} />
        <SeatGrid
          x={385}
          y={980}
          rows={6}
          cols={16}
          gap={18}
          colored={toColored([
            [4, 1, 'orange'],
            [4, 2, 'orange'],
            [4, 3, 'orange'],
            [4, 4, 'orange'],
            [4, 5, 'orange'],
            [4, 12, 'orange'],
            [4, 13, 'orange'],
            [4, 14, 'orange'],
            [4, 15, 'orange'],
            [5, 0, 'orange'],
            [5, 1, 'orange'],
            [5, 2, 'orange'],
            [5, 3, 'orange'],
            [5, 4, 'orange'],
            [5, 5, 'orange'],
            [5, 11, 'orange'],
            [5, 12, 'orange'],
            [5, 13, 'orange'],
            [5, 14, 'orange'],
            [5, 15, 'orange'],
          ])}
        />
        <RowLabels x={690} y={980} from={1} to={6} />
        <SeatGrid
          x={710}
          y={980}
          rows={6}
          cols={16}
          gap={18}
          colored={toColored(
            Array.from({ length: 16 }, (_, col) => [5, col, 'orange'] as [number, number, SeatTone])
              .concat(Array.from({ length: 15 }, (_, col) => [4, col, 'orange'] as [number, number, SeatTone]))
              .concat(Array.from({ length: 12 }, (_, col) => [3, col + 1, 'orange'] as [number, number, SeatTone]))
              .concat(Array.from({ length: 10 }, (_, col) => [2, col + 3, 'orange'] as [number, number, SeatTone]))
              .concat(Array.from({ length: 11 }, (_, col) => [1, col + 4, 'orange'] as [number, number, SeatTone]))
              .concat(Array.from({ length: 5 }, (_, col) => [0, col + 10, 'orange'] as [number, number, SeatTone])),
          )}
        />

        <SectionLabel x={532} y={1138} label="3F" />
      </svg>
    </div>
  );
}

export default ConcertHallMockup;
