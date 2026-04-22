'use client';

import React, { useState } from 'react';
import { useSeatData } from '@/src/features/book/api/useSeatData';
import { SSAFY_18 } from '@/src/shared/components/SSAFY_18';
import { InteractiveMapViewer } from '@/src/shared/components/InteractiveMapViewer';
import type { SeatColor, SeatStatus } from '@/src/shared/components/types';



interface BookViewProps {
  onClose: () => void;
}

export const BookView = ({ onClose }: BookViewProps) => {
  const { data: seatAvailability, isLoading } = useSeatData();
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());

  if (isLoading || !seatAvailability) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">좌석 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  const seatsData: Record<string, { color?: SeatColor; status: SeatStatus; isSelected: boolean }> = {};

  Object.entries(seatAvailability).forEach(([seatId, isAvailable]) => {
    const status: SeatStatus = isAvailable ? 'selectable' : 'disabled';
    const isSelected = selectedSeats.has(seatId);

    seatsData[seatId] = { status, isSelected };
  });

  const handleSeatClick = (id: string) => {
    if (seatsData[id]?.status === 'disabled') return;

    setSelectedSeats(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center bg-gray-50 dark:bg-zinc-900 overflow-y-auto pb-32">
      <header className="w-full bg-white dark:bg-zinc-950 p-6 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h1 className="text-xl font-bold">좌석 선택</h1>
        </div>
        <div className="text-sm font-medium text-gray-500">
          선택된 좌석: <span className="text-blue-600 font-bold">{selectedSeats.size}</span>석
        </div>
      </header>

      <div className="w-full p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-7xl">
          <InteractiveMapViewer>
            <SSAFY_18
              seatsData={seatsData}
              onSeatClick={handleSeatClick}
            />
          </InteractiveMapViewer>
        </div>
      </div>

      {selectedSeats.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800 shadow-lg flex justify-between items-center animate-slide-up z-20">
          <div className="flex gap-2 text-sm font-bold">
            {Array.from(selectedSeats).join(', ')}
          </div>
          <button className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
            결제하기
          </button>
        </div>
      )}
    </div>
  );
};
