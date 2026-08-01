'use client';

export interface ConcertHallMockupProps {
  className?: string;
}

import {
  RowLabels,
  SeatGrid,
  SectionLabel,
  WheelchairZone,
  type SeatTone,
  toColored,
  topCenterColored,
  topLeftColored,
  topRightColored,
} from './concertHall/ConcertHallParts';


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
