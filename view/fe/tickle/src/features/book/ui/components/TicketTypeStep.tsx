import React, { useState } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { Accordion } from '@/src/shared/components/Accordion';
import { BookingOptionsResponse } from '@/src/shared/api/types/booking.types';

interface TicketTypeStepProps {
  optionsData: BookingOptionsResponse;
  onSubmitPreorder: (
    seatIds: number[], 
    optionSelections: { sessionSeatId: number; discountName: string }[]
  ) => Promise<any>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const gradeDotColors: Record<string, string> = {
  'VIP': 'grade-dot-vip',
  'R': 'grade-dot-r',
  'S': 'grade-dot-s',
  'A': 'grade-dot-a',
};

export const TicketTypeStep: React.FC<TicketTypeStepProps> = ({
  optionsData,
  onSubmitPreorder,
  onCancel,
  isSubmitting = false,
}) => {
  const gradeTicketCounts = useBookStore((s: any) => s.gradeTicketCounts);
  const setGradeTicketCounts = useBookStore((s: any) => s.setGradeTicketCounts);

  const [openGrade, setOpenGrade] = useState<string | null>(null);

  // Group seats by grade from the backend optionsData
  const gradeSeats: Record<string, any[]> = {};
  optionsData.seats.forEach(seat => {
    if (!gradeSeats[seat.priceGrade]) gradeSeats[seat.priceGrade] = [];
    gradeSeats[seat.priceGrade].push(seat);
  });

  const getGradeTotal = (grade: string) => {
    const counts = gradeTicketCounts[grade] || {};
    return Object.values(counts).reduce((s: number, n: any) => s + (n as number), 0);
  };

  const getGradePrice = (grade: string) => {
    const seatsInGrade = gradeSeats[grade] || [];
    if (seatsInGrade.length === 0) return 0;
    
    // We assume all seats in the same grade share the same base price and discounts
    const baseSeat = seatsInGrade[0];
    const types = baseSeat.discountInfo;
      
    const counts = gradeTicketCounts[grade] || {};
    return Object.entries(counts).reduce((sum, [typeId, count]: [string, any]) => {
      const type = types.find((t: any) => t.discountName === typeId);
      const typePrice = type ? type.ticketPriceAmount : baseSeat.priceAmount;
      return sum + typePrice * (count as number);
    }, 0);
  };

  const totalPrice = Object.keys(gradeSeats).reduce((sum, grade) => sum + getGradePrice(grade), 0);
  const originalPrice = optionsData.seats.reduce((sum, seat) => sum + seat.priceAmount, 0);
  const discountAmount = originalPrice - totalPrice;

  const handleCount = (grade: string, typeId: string, delta: number) => {
    setGradeTicketCounts((prev: any) => {
      const gradeCounts = { ...(prev[grade] || {}) };
      const current = gradeCounts[typeId] || 0;
      const newVal = Math.max(0, current + delta);
      const maxForGrade = gradeSeats[grade].length;
      
      const otherTotal = Object.entries(gradeCounts)
        .filter(([id]) => id !== typeId)
        .reduce((s: number, [, n]: [string, any]) => s + (n as number), 0);
        
      if (otherTotal + newVal > maxForGrade) return prev;
      
      gradeCounts[typeId] = newVal;
      return { ...prev, [grade]: gradeCounts };
    });
  };

  const handleSubmit = () => {
    // Convert gradeTicketCounts into optionSelections array expected by backend
    const optionSelections: { sessionSeatId: number; discountName: string }[] = [];
    const seatIds = optionsData.seats.map(s => s.sessionSeatId);
    
    // Distribute selected discount types to the seats in each grade
    Object.entries(gradeSeats).forEach(([grade, seats]) => {
      const counts = gradeTicketCounts[grade] || {};
      let seatIndex = 0;
      
      Object.entries(counts).forEach(([discountName, count]: [string, any]) => {
        for (let i = 0; i < (count as number); i++) {
          if (seatIndex < seats.length) {
            optionSelections.push({
              sessionSeatId: seats[seatIndex].sessionSeatId,
              discountName
            });
            seatIndex++;
          }
        }
      });
    });

    onSubmitPreorder(seatIds, optionSelections);
  };

  const isAllSeatsAssigned = Object.keys(gradeSeats).every(g => getGradeTotal(g) === gradeSeats[g].length);

  return (
    <div className="absolute inset-0 bg-gray-50 dark:bg-zinc-950 flex flex-col z-30 animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          aria-label="뒤로"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">인원 선택</h2>
      </div>

      {/* Grade list with Accordions */}
      <div className="flex-1 overflow-y-auto px-3 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <p className="text-sm text-gray-500 mb-5 px-3">좌석 등급별로 관람 인원 유형을 선택해주세요.</p>
        <div className="flex flex-col gap-3">
          {Object.entries(gradeSeats).map(([grade, seats]) => {
            const maxCount = seats.length;
            const currentTotal = getGradeTotal(grade);
            const dotClass = gradeDotColors[grade] || 'bg-gray-400';
            const isFull = currentTotal >= maxCount;

            return (
              <div key={grade} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <Accordion
                  isOpen={openGrade === grade}
                  onToggle={(isOpen) => setOpenGrade(isOpen ? grade : null)}
                  title={
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full ${dotClass}`} />
                        <span className="font-bold text-gray-900 dark:text-white text-[15px]">{grade}석</span>
                        <span className="text-xs text-gray-400 font-medium">{seats.map(s => s.seatLabel).join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-extrabold px-2.5 py-1 rounded-full ${isFull
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-orange-100 text-orange-600'
                          }`}>
                          {currentTotal} / {maxCount}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <div className="flex flex-col gap-2 px-1">
                    {(() => {
                      const baseSeat = seats[0];
                      const types = baseSeat.discountInfo;

                      return types.map((type: any) => {
                        const count = gradeTicketCounts[grade]?.[type.discountName] || 0;
                        const typePrice = type.ticketPriceAmount;
                        const canAdd = currentTotal < maxCount;
                        const canRemove = count > 0;

                        return (
                          <div
                            key={type.discountName}
                            className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${count > 0
                              ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800'
                              : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                              }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-[14px] ${count > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {type.discountName}
                                </span>
                                {type.discountRate > 0 && (
                                  <span className="text-[11px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                    {type.discountRate}%↓
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{typePrice.toLocaleString()}원</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleCount(grade, type.discountName, -1)}
                                disabled={!canRemove}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${canRemove
                                  ? 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 active:scale-90'
                                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                                  }`}
                              >
                                −
                              </button>
                              <span className={`w-6 text-center font-extrabold text-[16px] ${count > 0 ? 'text-blue-600' : 'text-gray-400'
                                }`}>{count}</span>
                              <button
                                onClick={() => handleCount(grade, type.discountName, 1)}
                                disabled={!canAdd}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${canAdd
                                  ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-90'
                                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                                  }`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </Accordion>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom checkout bar */}
      <div className="p-6 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">좌석 금액</span>
            <span className="text-sm text-gray-400 line-through">{originalPrice.toLocaleString()}원</span>
            {discountAmount > 0 && (
              <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">-{discountAmount.toLocaleString()}원</span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-gray-500 font-medium">총 결제 금액</span>
            <span className="text-2xl font-extrabold text-blue-600 ml-1">
              {totalPrice.toLocaleString()}원
            </span>
          </div>
        </div>
        <button
          disabled={!isAllSeatsAssigned || isSubmitting}
          onClick={handleSubmit}
          className={`px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-md ${!isAllSeatsAssigned || isSubmitting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-600/20'
            }`}
        >
          {isSubmitting ? '진행 중...' : '다음 단계'}
        </button>
      </div>
    </div>
  );
};
