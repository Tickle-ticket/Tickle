import React from 'react';
import { InteractiveMapViewer } from '@/src/shared/components/InteractiveMapViewer';
import { Toggle } from '@/src/shared/components/Toggle';
import { PriceLegend, type GradePrice } from '@/src/shared/components/PriceLegend';
import type { SeatColor, SeatStatus, CongestionLevel, StageComponentProps } from '@/src/shared/components/types';

interface SeatMapPanelProps {
  scheduleId: string | null;
  isModifyingSchedule: boolean;
  isSeatsLoading: boolean;
  venueId?: string | number | null;
  StageComponent: React.ComponentType<StageComponentProps> | null;
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
  seatPrices: GradePrice[];
  maxSelectable?: number;
  selectedCount?: number;
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
  maxSelectable,
  selectedCount,
}) => {
  return (
    <div className="w-full h-full bg-surface-muted lg:border-r border-b lg:border-b-0 border-line shadow-inner relative group/map overflow-hidden">
      {/* Overlay when schedule is not selected or modifying (desktop only) */}
      {(!scheduleId || isModifyingSchedule) && (
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-[2px] z-30 hidden lg:flex flex-col items-center justify-center animate-fade-in pointer-events-auto">
          <div className="bg-surface p-8 rounded-2xl shadow-xl border border-line-subtle flex flex-col items-center gap-4 max-w-[80%] text-center transform -translate-y-4">
            <div className="w-16 h-16 bg-primary-subtle rounded-full flex items-center justify-center text-primary">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <p className="text-xl font-extrabold text-content mb-2">
                {scheduleId ? '일시를 변경 중입니다' : '관람 일시를 먼저 선택해주세요'}
              </p>
              <p className="text-sm text-content-tertiary">
                패널에서 원하시는 날짜와 회차를 선택하시면<br />좌석 예매가 활성화됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay when seats are loading */}
      {scheduleId && isSeatsLoading && (
        <div className="absolute inset-0 bg-surface/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-bold mt-4 bg-surface/80 px-4 py-2 rounded-full shadow-sm">실시간 좌석 정보 불러오는 중...</p>
        </div>
      )}

      <InteractiveMapViewer showZoomControls={true}>
        {(() => {
          if (!venueId || !StageComponent) {
            return (
              <div className="flex items-center justify-center h-full min-h-[600px] text-content-tertiary bg-surface-subtle rounded-xl border border-line">
                <p className="font-medium text-lg">공연장 정보를 불러오는 중입니다...</p>
              </div>
            );
          }

          return (
            <React.Suspense fallback={
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        <div className="absolute top-[80px] lg:top-4 right-4 z-20 flex items-center gap-1.5 sm:gap-2 bg-surface/90 backdrop-blur-sm px-2.5 py-1.5 sm:px-4 sm:py-3 rounded-full shadow-lg border border-line">
          <span
            className="text-xs sm:text-sm font-bold text-content cursor-pointer select-none whitespace-nowrap"
            onClick={() => setViewMode(viewMode === 'grade' ? 'congestion' : 'grade')}
          >
            혼잡도 보기
          </span>
          <Toggle
            checked={viewMode === 'congestion'}
            onChange={(checked) => setViewMode(checked ? 'congestion' : 'grade')}
            size="small"
            className="sm:hidden"
          />
          <Toggle
            checked={viewMode === 'congestion'}
            onChange={(checked) => setViewMode(checked ? 'congestion' : 'grade')}
            size="medium"
            className="hidden sm:flex"
          />
        </div>
      )}

      {/* Maximum Selection Limit Notice */}
      {scheduleId && !isModifyingSchedule && !isSeatsLoading && selectedCount !== undefined && maxSelectable !== undefined && maxSelectable !== 99 && selectedCount >= maxSelectable && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex justify-center animate-fade-in pointer-events-none w-full px-4">
          <div className="bg-surface/95 backdrop-blur-md px-4 sm:px-5 py-3 rounded-2xl shadow-lg border border-danger/30 flex items-center gap-2 sm:gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="text-sm sm:text-base font-bold text-content break-keep">
              예매 가능 한도(최대 4개)를 모두 선택하여 더 이상 좌석을 선택할 수 없습니다.
            </span>
          </div>
        </div>
      )}

      <PriceLegend prices={seatPrices} viewMode={viewMode} />
    </div>
  );
};
