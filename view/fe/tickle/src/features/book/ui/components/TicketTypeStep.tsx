import React, { useState } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { Accordion } from '@/src/shared/components/Accordion';
import {
  BookingOptionsResponse,
  type BookingSeatOptionResponse,
} from '@/src/shared/api/types/booking.types';
import { resolvePriceInfos, findBasePrice, calculateGradeTotal } from '../../api/priceInfo';

interface TicketTypeStepProps {
  optionsData: BookingOptionsResponse;
  onSubmitPreorder: (
    seatIds: number[],
    optionSelections: { sessionSeatId: number; discountName: string }[]
  ) => Promise<any>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const priceGradeDotColors: Record<string, string> = {
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
  submitButtonText = '다음 단계',
}) => {
  const priceGradeTicketCounts = useBookStore((s) => s.priceGradeTicketCounts);
  const setPriceGradeTicketCounts = useBookStore((s) => s.setPriceGradeTicketCounts);

  // Group seats by grade from the backend optionsData
  const priceGradeSeats: Record<string, BookingSeatOptionResponse[]> = {};
  optionsData.seats.forEach(seat => {
    if (!priceGradeSeats[seat.priceGrade]) priceGradeSeats[seat.priceGrade] = [];
    priceGradeSeats[seat.priceGrade].push(seat);
  });

  const [openPriceGrade, setOpenPriceGrade] = useState<string | null>(() => {
    const grades = Object.keys(priceGradeSeats);
    return grades.length > 0 ? grades[0] : null;
  });

  const getPriceGradeTotal = (priceGrade: string) => {
    const counts = priceGradeTicketCounts[priceGrade] || {};
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  const getPriceGradePrice = (priceGrade: string) => {
    const seatsInGrade = priceGradeSeats[priceGrade] || [];
    if (seatsInGrade.length === 0) return 0;

    // We assume all seats in the same grade share the same base price and discounts
    const types = resolvePriceInfos(seatsInGrade[0], optionsData);
    const counts = priceGradeTicketCounts[priceGrade] || {};
    return calculateGradeTotal(types, counts);
  };

  const totalPrice = Object.keys(priceGradeSeats).reduce((sum, priceGrade) => sum + getPriceGradePrice(priceGrade), 0);
  const originalPrice = optionsData.seats.reduce(
    (sum, seat) => sum + findBasePrice(resolvePriceInfos(seat, optionsData)),
    0,
  );
  const discountAmount = originalPrice - totalPrice;

  const handleCount = (priceGrade: string, typeId: string, delta: number) => {
    let becameFull = false;

    setPriceGradeTicketCounts((prev) => {
      const priceGradeCounts = { ...(prev[priceGrade] || {}) };
      const current = priceGradeCounts[typeId] || 0;
      const newVal = Math.max(0, current + delta);
      const maxForPriceGrade = priceGradeSeats[priceGrade].length;

      const otherTotal = Object.entries(priceGradeCounts)
        .filter(([id]) => id !== typeId)
        .reduce((sum, [, count]) => sum + count, 0);

      if (otherTotal + newVal > maxForPriceGrade) return prev;

      priceGradeCounts[typeId] = newVal;
      
      if (delta > 0 && otherTotal + newVal === maxForPriceGrade) {
        becameFull = true;
      }

      return { ...prev, [priceGrade]: priceGradeCounts };
    });

    if (becameFull) {
      setTimeout(() => {
        const grades = Object.keys(priceGradeSeats);
        const nextGrade = grades.find(g => {
          if (g === priceGrade) return false;
          return getPriceGradeTotal(g) < priceGradeSeats[g].length;
        });
        
        setOpenPriceGrade(nextGrade || null);
      }, 350);
    }
  };

  const handleSubmit = () => {
    // Convert priceGradeTicketCounts into optionSelections array expected by backend
    const optionSelections: { sessionSeatId: number; discountName: string }[] = [];
    const seatIds = optionsData.seats.map(s => s.sessionSeatId);

    // Distribute selected discount types to the seats in each grade
    Object.entries(priceGradeSeats).forEach(([priceGrade, seats]) => {
      const counts = priceGradeTicketCounts[priceGrade] || {};
      let seatIndex = 0;

      Object.entries(counts).forEach(([discountName, count]) => {
        for (let i = 0; i < (count as number); i++) {
          if (seatIndex < seats.length) {
            optionSelections.push({
              sessionSeatId: seats[seatIndex].sessionSeatId,
              discountName: discountName
            });
            seatIndex++;
          }
        }
      });
    });

    onSubmitPreorder(seatIds, optionSelections);
  };

  const isAllSeatsAssigned = Object.keys(priceGradeSeats).every(g => getPriceGradeTotal(g) === priceGradeSeats[g].length);

  return (
    <div className="absolute inset-0 bg-surface-subtle flex flex-col z-30 animate-fade-in">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-line flex items-center gap-3 shrink-0">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="p-1.5 sm:p-2 hover:bg-surface-muted:bg-surface-inverse rounded-full transition-colors"
          aria-label="뒤로"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2 className="text-lg sm:text-xl font-extrabold text-content">인원 선택</h2>
      </div>

      {/* Grade list with Accordions */}
      <div className="flex-1 overflow-y-auto px-3 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <p className="text-sm text-content-tertiary mb-5 px-3">좌석 등급별로 관람 인원 유형을 선택해주세요.</p>
        <div className="flex flex-col gap-3">
          {Object.entries(priceGradeSeats).map(([priceGrade, seats]) => {
            const maxCount = seats.length;
            const currentTotal = getPriceGradeTotal(priceGrade);
            const dotClass = priceGradeDotColors[priceGrade] || 'bg-surface-active';
            const isFull = currentTotal >= maxCount;

            return (
              <div key={priceGrade} className="bg-surface rounded-2xl border border-line overflow-hidden">
                <Accordion
                  isOpen={openPriceGrade === priceGrade}
                  onToggle={(isOpen) => setOpenPriceGrade(isOpen ? priceGrade : null)}
                  title={
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full ${dotClass}`} />
                        <span className="font-bold text-content text-[15px]">{priceGrade}석</span>
                        <span className="text-xs text-content-muted font-medium">{seats.map(s => s.seatLabel).join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-extrabold px-2.5 py-1 rounded-full ${isFull
                          ? 'bg-primary-light text-primary'
                          : 'bg-warning-light text-warning'
                          }`}>
                          {currentTotal} / {maxCount}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <div className="flex flex-col gap-2 px-1">
                    {(() => {
                      const types = resolvePriceInfos(seats[0], optionsData);

                      return types.map((type) => {
                        const count = priceGradeTicketCounts[priceGrade]?.[type.discountName] || 0;
                        const typePrice = type.ticketPriceAmount;
                        const canAdd = currentTotal < maxCount;
                        const canRemove = count > 0;

                        return (
                          <div
                            key={type.discountName}
                            className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${count > 0
                              ? 'border-primary-light bg-primary-subtle/50'
                              : 'border-line bg-surface'
                              }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-[14px] ${count > 0 ? 'text-primary-hover' : 'text-content-secondary'}`}>
                                  {type.discountName}
                                </span>
                                {type.discountRate > 0 && (
                                  <span className="text-[11px] font-bold text-danger bg-danger-subtle px-1.5 py-0.5 rounded">
                                    {type.discountRate}%↓
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-content-tertiary">{typePrice.toLocaleString()}원</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleCount(priceGrade, type.discountName, -1)}
                                disabled={!canRemove}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${canRemove
                                  ? 'bg-surface-active text-content-secondary hover:bg-surface-active active:scale-90'
                                  : 'bg-surface-muted text-content-muted cursor-not-allowed'
                                  }`}
                              >
                                −
                              </button>
                              <span className={`w-6 text-center font-extrabold text-[16px] ${count > 0 ? 'text-primary' : 'text-content-muted'
                                }`}>{count}</span>
                              <button
                                onClick={() => handleCount(priceGrade, type.discountName, 1)}
                                disabled={!canAdd}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${canAdd
                                  ? 'bg-primary text-white hover:bg-primary active:scale-90'
                                  : 'bg-surface-muted text-content-muted cursor-not-allowed'
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
      <div className="p-3 sm:p-6 border-t border-line bg-surface flex justify-between items-center shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] gap-3">
        <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-xs sm:text-sm text-content-muted font-medium">좌석 금액</span>
            <span className="text-xs sm:text-sm text-content-muted line-through">{originalPrice.toLocaleString()}원</span>
            {discountAmount > 0 && (
              <span className="text-[10px] sm:text-xs font-bold text-danger bg-danger-subtle px-1 sm:px-1.5 py-0.5 rounded">-{discountAmount.toLocaleString()}원</span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs sm:text-sm text-content-tertiary font-medium">총 결제 금액</span>
            <span className="text-xl sm:text-2xl font-extrabold text-primary ml-1">
              {totalPrice.toLocaleString()}원
            </span>
          </div>
        </div>
        <button
          disabled={!isAllSeatsAssigned || isSubmitting}
          onClick={handleSubmit}
          className={`px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all shadow-md shrink-0 ${!isAllSeatsAssigned || isSubmitting
            ? 'bg-surface-active text-content-tertiary cursor-not-allowed shadow-none'
            : 'bg-primary text-white hover:bg-primary-hover active:scale-95 shadow-blue-600/20'
            }`}
        >
          {isSubmitting ? '진행 중...' : submitButtonText}
        </button>
      </div>
    </div>
  );
};
