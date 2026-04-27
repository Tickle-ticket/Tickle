import React from 'react';
import { Seat } from './Seat';
import { Stage } from './Stage';
import type { SeatColor, SeatStatus, CongestionLevel } from './types';

export interface SSAFY_18_Props {
  seatsData?: Record<string, { color?: SeatColor; status?: SeatStatus; isSelected?: boolean }>;
  onSeatClick?: (seatId: string) => void;
  onSeatPointerDown?: (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  onSeatPointerEnter?: (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  onSeatPointerUp?: (seatId: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  className?: string;
  seatClassName?: string;
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
  [null, 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'],
  [null, 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'],
  [null, 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7'],
  [null, 'J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7'],
  ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'],
  ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'],
  ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'],
  ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'],
  ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8'],
  ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
];

const lowerRight = [
  ['G8', 'G9', 'G10', 'G11', 'G12', 'G13', 'G14', null],
  ['H8', 'H9', 'H10', 'H11', 'H12', 'H13', 'H14', null],
  ['I8', 'I9', 'I10', 'I11', 'I12', 'I13', 'I14', null],
  ['J8', 'J9', 'J10', 'J11', 'J12', 'J13', 'J14', null],
  ['K9', 'K10', 'K11', 'K12', 'K13', 'K14', 'K15', 'K16'],
  ['L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
  ['M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'],
  ['N9', 'N10', 'N11', 'N12', 'N13', 'N14', 'N15', 'N16'],
  ['O9', 'O10', 'O11', 'O12', 'O13', 'O14', 'O15', 'O16'],
  ['P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16'],
];

const seatSections = [upperLeft, upperRight, lowerLeft, lowerRight];

export const SSAFY_18_SEAT_IDS = seatSections.flatMap((section) =>
  section.flatMap((row) => row.filter((seatId): seatId is string => seatId !== null)),
);

const SeatWrapper = ({
  id,
  data,
  isDefaultMode,
  onClick,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  seatClassName,
}: {
  id: string | null;
  data?: { color?: SeatColor; status?: SeatStatus; congestion?: CongestionLevel; isSelected?: boolean };
  isDefaultMode: boolean;
  onClick?: (id: string) => void;
  onPointerDown?: (id: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerEnter?: (id: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp?: (id: string, event: React.PointerEvent<HTMLCanvasElement>) => void;
  seatClassName?: string;
}) => {
  if (!id) return <div className="w-[36px] h-[42px] shrink-0" />;

  const hasDataForThisSeat = data !== undefined;
  const isMissingSeat = !isDefaultMode && !hasDataForThisSeat;

  const finalColor = isMissingSeat ? 'gray' : (data?.color || 'gray');
  const finalStatus = isMissingSeat ? 'disabled' : (data?.status || 'selectable');
  const finalCongestion = isMissingSeat ? 'none' : (data?.congestion || 'none');

  return (
    <div className="w-[36px] h-[42px] shrink-0">
      <Seat
        color={finalColor}
        status={finalStatus}
        congestion={finalCongestion}
        isSelected={data?.isSelected || false}
        onClick={() => onClick?.(id)}
        onPointerDown={(event) => onPointerDown?.(id, event)}
        onPointerEnter={(event) => onPointerEnter?.(id, event)}
        onPointerUp={(event) => onPointerUp?.(id, event)}
        className={seatClassName}
      />
    </div>
  );
};

export const SSAFY_18 = ({
  seatsData = {},
  onSeatClick,
  onSeatPointerDown,
  onSeatPointerEnter,
  onSeatPointerUp,
  className = '',
  seatClassName = '',
}: SSAFY_18_Props) => {
  const isDefaultMode = Object.keys(seatsData).length === 0;

  const renderGrid = (grid: (string | null)[][]) => {
    const maxCols = Math.max(...grid.map(row => row.length));
    
    // 열 헤더 (각 열의 첫 번째 유효한 좌석에서 숫자 추출)
    const colHeaders = Array.from({ length: maxCols }).map((_, colIndex) => {
      for (const row of grid) {
        if (row[colIndex]) {
          return row[colIndex]!.replace(/[a-zA-Z]/g, '');
        }
      }
      return '';
    });

    return (
      <div className="flex flex-col gap-1.5">
        {/* 열 헤더 */}
        <div className="flex gap-1.5 pl-6 mb-1">
          {colHeaders.map((colNum, idx) => (
            <div key={`col-${idx}`} className="w-[36px] shrink-0 flex justify-center items-end">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">{colNum}</span>
            </div>
          ))}
        </div>

        {/* 행 및 좌석들 */}
        {grid.map((row, rowIndex) => {
          let rowLabel = '';
          for (const cell of row) {
            if (cell) {
              rowLabel = cell.replace(/[0-9]/g, '');
              break;
            }
          }

          return (
            <div key={`row-${rowIndex}`} className="flex gap-1.5 items-center">
              {/* 행 헤더 */}
              <div className="w-5 shrink-0 flex justify-end pr-1">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{rowLabel}</span>
              </div>
              
              {/* 좌석 */}
              {row.map((cellId, colIndex) => (
                <SeatWrapper
                  key={cellId || `empty-${rowIndex}-${colIndex}`}
                  id={cellId}
                  data={cellId ? seatsData[cellId] : undefined}
                  isDefaultMode={isDefaultMode}
                  onClick={onSeatClick}
                  onPointerDown={onSeatPointerDown}
                  onPointerEnter={onSeatPointerEnter}
                  onPointerUp={onSeatPointerUp}
                  seatClassName={seatClassName}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center gap-12 p-12 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm overflow-x-auto min-w-max ${className}`}>
      {/* 1. Stage Area */}
      <div className="flex flex-col items-center gap-3 w-full">
        <Stage width={480} height={72} label="무대" />
      </div>

      {/* 2. Upper Seats */}
      <div className="flex gap-12">
        {renderGrid(upperLeft)}
        {renderGrid(upperRight)}
      </div>

      {/* 3. Lower Seats */}
      <div className="flex gap-10">
        {renderGrid(lowerLeft)}
        {renderGrid(lowerRight)}
      </div>
    </div>
  );
};
