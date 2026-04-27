'use client';

import React, { useState } from 'react';
import { useSeatData } from '@/src/features/book/api/useSeatData';
import { SSAFY_18 } from '@/src/shared/components/SSAFY_18';
import type { SeatColor, SeatStatus } from '@/src/shared/components/types';

// 좌석 위치에 따라 반별 색상을 매핑해주는 헬퍼 함수
const getSeatColor = (id: string): SeatColor => {
  const row = id[0];
  const col = parseInt(id.slice(1));

  // 상단 블록 (A, B, C)
  if (['A', 'B', 'C'].includes(row)) {
    if (col <= 5) return 'gray';     // 좌측 (6반 느낌)
    if (id === 'A6') return 'purple'; // 1반
    return 'yellow';                 // 우측 (4반 느낌)
  }

  // 중단 블록 (G, H, I, J)
  if (['G', 'H', 'I', 'J'].includes(row)) {
    if (col <= 7) return 'mint';     // 좌측 (2반 느낌)
    if (col >= 8) return 'yellow';   // 우측 (4반 느낌)
  }

  // 하단 블록 (K, L, M, N, O, P)
  if (['K', 'L', 'M', 'N', 'O', 'P'].includes(row)) {
    if (col <= 8) return 'pink';     // 좌측 (3반 느낌)
    if (col >= 9) return 'orange';   // 우측 (5반 느낌)
  }

  return 'blue';
};

export default function BookPage() {
  const { data: seatAvailability, isLoading } = useSeatData('demo-schedule');
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());

  // 데이터 로딩 중
  if (isLoading || !seatAvailability) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">좌석 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // API에서 받아온 true/false 정보를 SSAFY_18 컴포넌트에 맞는 형태로 가공
  const seatsData: Record<string, { color: SeatColor; status: SeatStatus; isSelected: boolean }> = {};

  Object.entries(seatAvailability).forEach(([seatId, isAvailable]) => {
    // 이미 예매되었거나 시야제한석이면 status를 'disabled'로 처리
    const status: SeatStatus = isAvailable ? 'selectable' : 'disabled';
    const color = getSeatColor(seatId);
    const isSelected = selectedSeats.has(seatId);

    seatsData[seatId] = { color, status, isSelected };
  });

  // 좌석 클릭 핸들러
  const handleSeatClick = (id: string) => {
    // 비활성화된 좌석은 클릭 무시
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
    <div className="flex h-screen w-full flex-col items-center bg-gray-50 overflow-y-auto">
      <header className="w-full bg-white p-6 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold">좌석 선택</h1>
        <div className="text-sm font-medium text-gray-500">
          선택된 좌석: <span className="text-blue-600 font-bold">{selectedSeats.size}</span>석
        </div>
      </header>
      
      <div className="w-full p-8 flex justify-center">
        <SSAFY_18 
          seatsData={seatsData} 
          onSeatClick={handleSeatClick} 
        />
      </div>

      {/* 서버 수신 원본 데이터 확인 패널 */}
      <div className="w-full max-w-5xl p-6 mb-32 bg-white rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold mb-4 text-gray-800">
          서버 수신 원본 데이터 (true/false)
        </h2>
        <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 overflow-auto max-h-96 border border-gray-100">
          {JSON.stringify(seatAvailability, null, 2)}
        </pre>
      </div>

      {/* 하단 결제 바 */}
      {selectedSeats.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 shadow-lg flex justify-between items-center animate-slide-up">
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
}
