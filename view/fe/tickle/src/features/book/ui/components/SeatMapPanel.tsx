import React from 'react';
import { InteractiveMapViewer } from '@/src/shared/components/InteractiveMapViewer';
import { Toggle } from '@/src/shared/components/Toggle';
import { PriceLegend } from '@/src/shared/components/PriceLegend';
import type { SeatColor, SeatStatus, CongestionLevel } from '@/src/shared/components/types';

interface SeatMapPanelProps {
  scheduleId: string | null;
  isModifyingSchedule: boolean;
  isSeatsLoading: boolean;
  venueId?: string | number | null;
  StageComponent: React.ComponentType<any> | null;
  seatsData: Record<string, {
    color?: SeatColor;
    status: SeatStatus;
    isSelected: boolean;
    congestion?: CongestionLevel;
    sessionSeatId?: number;
    detailedInfo?: string;
  }>;
  handleSeatClick: (id: string, e?: React.MouseEvent) => void;
  isWaitlistMode: boolean;
  viewMode: 'grade' | 'congestion';
  setViewMode: (mode: 'grade' | 'congestion') => void;
  seatPrices: any[];
}

export const SeatMapPanel: React.FC<SeatMapPanelProps> = ({
  scheduleId,
  isModifyingSchedule,
  isSeatsLoading,
  venueId,
  StageComponent,
  seatsData,
  handleSeatClick,
  isWaitlistMode,
  viewMode,
  setViewMode,
  seatPrices,
}) => {
  return (
    <div className="w-[60%] h-full bg-gray-100 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 shadow-inner relative group/map overflow-hidden">
      {/* Overlay when schedule is not selected or modifying */}
      {(!scheduleId || isModifyingSchedule) && (
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center animate-fade-in pointer-events-auto">
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 flex flex-col items-center gap-4 max-w-[80%] text-center transform -translate-y-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
                {scheduleId ? '일시를 변경 중입니다' : '관람 일시를 먼저 선택해주세요'}
              </p>
              <p className="text-sm text-gray-500">
                오른쪽 패널에서 원하시는 날짜와 회차를 선택하시면<br />좌석 예매가 활성화됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay when seats are loading */}
      {scheduleId && isSeatsLoading && (
        <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-600 font-bold mt-4 bg-white/80 dark:bg-zinc-800/80 px-4 py-2 rounded-full shadow-sm">실시간 좌석 정보 불러오는 중...</p>
        </div>
      )}

      <InteractiveMapViewer showZoomControls={true}>
        {(() => {
          if (!venueId || !StageComponent) {
            return (
              <div className="flex items-center justify-center h-full min-h-[600px] text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
                <p className="font-medium text-lg">공연장 정보를 불러오는 중입니다...</p>
              </div>
            );
          }

          return (
            <React.Suspense fallback={
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }>
              <StageComponent
                seatsData={seatsData}
                onSeatClick={handleSeatClick}
              />
            </React.Suspense>
          );
        })()}
      </InteractiveMapViewer>

      {isWaitlistMode && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-200 dark:border-zinc-700">
          <span
            className="text-sm font-extrabold text-gray-800 dark:text-gray-200 cursor-pointer select-none"
            onClick={() => setViewMode(viewMode === 'grade' ? 'congestion' : 'grade')}
          >
            혼잡도 보기
          </span>
          <Toggle
            checked={viewMode === 'congestion'}
            onChange={(checked) => setViewMode(checked ? 'congestion' : 'grade')}
            size="medium"
          />
        </div>
      )}

      <PriceLegend prices={seatPrices} viewMode={viewMode} />
    </div>
  );
};
