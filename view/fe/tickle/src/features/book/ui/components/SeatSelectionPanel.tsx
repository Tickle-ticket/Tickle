import React from 'react';
import { Calendar } from '@/src/shared/components/Calendar';

interface SeatSelectionPanelProps {
  eventDetail: any;
  confirmedSchedule: any;
  setConfirmedSchedule: (schedule: any) => void;
  isModifyingSchedule: boolean;
  setIsModifyingSchedule: (val: boolean) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
  isCancelMode: boolean;
  isModifyModeActive: boolean;
  setIsModifyModeActive: (val: boolean) => void;
  cartSeats: Set<string>;
  selectedSeats: Set<string>;
  setSelectedSeats: (seats: Set<string>) => void;
  selectedSeatsToCancel: Set<string>;
  setSelectedSeatsToCancel: (seats: Set<string>) => void;
  initialSeats: string[];
  initialSchedule: any;
  isWaitlistMode: boolean;
  getSeatInfo: (seatId: string) => { grade: string; price: number };
  getDetailedSeatInfo: (seatId: string) => string;
  handleNextStep: (e: React.MouseEvent) => void;
  onClose: () => void;
  effectiveSeatsToCancel: Set<string>;
  scheduleId: string | null;
  onError: (title: string, message: string) => void;
}

export const SeatSelectionPanel: React.FC<SeatSelectionPanelProps> = ({
  eventDetail,
  confirmedSchedule,
  setConfirmedSchedule,
  isModifyingSchedule,
  setIsModifyingSchedule,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  isCancelMode,
  isModifyModeActive,
  setIsModifyModeActive,
  cartSeats,
  selectedSeats,
  setSelectedSeats,
  selectedSeatsToCancel,
  setSelectedSeatsToCancel,
  initialSeats,
  initialSchedule,
  isWaitlistMode,
  getSeatInfo,
  getDetailedSeatInfo,
  handleNextStep,
  onClose,
  effectiveSeatsToCancel,
  scheduleId,
  onError
}) => {

  return (
    <>
      {(!confirmedSchedule || isModifyingSchedule) ? (
        // Phase 1: Schedule Selection
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 relative">
          {confirmedSchedule && isModifyingSchedule && (
            <button
              onClick={() => {
                setIsModifyingSchedule(false);
                setSelectedDate(confirmedSchedule.date);
                setSelectedTime(confirmedSchedule.time);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
              aria-label="변경 취소"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          <div className="flex flex-col pr-12">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">관람 일시 선택</h2>
          </div>

          {/* Date Selection */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold">1</span>
              날짜 선택
            </h3>
            <div className="flex justify-center w-full">
              <div className="w-full flex justify-center scale-[0.93] origin-top -mb-[25px]">
                <Calendar
                  enabledDates={eventDetail.schedules.map((s: any) => s.date.replace(/\./g, '-'))}
                  selectedDate={selectedDate ? selectedDate.replace(/\./g, '-') : null}
                  onSelect={(date: Date, e?: React.MouseEvent) => {
                    if (e && !e.isTrusted) {
                      window.location.href = '/blocked';
                      return;
                    }
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setSelectedDate(`${year}.${month}.${day}`);
                    setSelectedTime(null);
                  }}
                  className="w-full max-w-[340px] shadow-sm border border-gray-100 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Time Selection */}
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-zinc-800 pt-4 pb-4 z-10">
            <h3 className="text-[15px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold">2</span>
              회차 선택
            </h3>
            {selectedDate ? (
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {eventDetail.schedules.find((s: any) => s.date === selectedDate)?.times.map((timeObj: any, idx: number) => (
                  <button
                    key={timeObj.time}
                    onClick={() => {
                      const newTime = timeObj.time;

                      // 이전에 확정된 스케줄이 있고, 그 스케줄과 다른 일시를 선택했다면
                      if (confirmedSchedule && (confirmedSchedule.date !== selectedDate || confirmedSchedule.time !== newTime)) {
                        // 예약 변경 모드가 아닌 신규 예매일 때만 좌석을 초기화합니다.
                        if (!isModifyModeActive) {
                          setSelectedSeats(new Set());
                        }
                      }

                      setSelectedTime(newTime);
                      setConfirmedSchedule({ date: selectedDate!, time: newTime, scheduleId: timeObj.scheduleId });
                      setIsModifyingSchedule(false);
                    }}
                    className={`w-[calc(50%-4px)] min-w-[125px] px-3 py-2.5 rounded-xl border-2 font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${selectedTime === timeObj.time
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20 transform scale-[1.02]'
                      : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-700'
                      }`}
                  >
                    <span className="text-[14px]">{idx + 1}회차 - {timeObj.time}</span>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-0.5">
                      {timeObj.remainingSeats.map((seat: any) => {
                        const gradeColors: Record<string, string> = {
                          'VIP': 'grade-badge-vip',
                          'R': 'grade-badge-r',
                          'S': 'grade-badge-s',
                          'A': 'grade-badge-a',
                        };
                        const defaultColor = 'bg-gray-50 text-gray-600 border-gray-200';

                        return (
                          <span
                            key={seat.grade}
                            className={`flex items-center gap-0.5 px-1 py-[1px] rounded-[4px] text-[10px] border ${gradeColors[seat.grade] || defaultColor}`}
                          >
                            <span className="font-extrabold">{seat.grade}</span>
                            <span>{seat.count}</span>
                          </span>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-7 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 animate-fade-in">
                <p className="text-gray-500 font-medium text-[14px]">관람 일자를 먼저 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Phase 2: Seat Selection (Current UI)
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 pb-32 animate-fade-in [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex justify-between items-center bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm mb-4 shrink-0">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">선택된 일시</span>
              <span className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                {selectedDate} <span className="text-gray-300">|</span> {selectedTime}
              </span>
            </div>
            {(!isCancelMode || isModifyModeActive) && (
              <button
                onClick={() => setIsModifyingSchedule(true)}
                className="text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-gray-600 bg-gray-100 dark:bg-zinc-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                일시 변경
              </button>
            )}
            {isCancelMode && !isModifyModeActive && (
              <button
                onClick={() => setIsModifyModeActive(true)}
                className="text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
              >
                예약 변경 모드로 전환
              </button>
            )}
          </div>

          <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-4 shrink-0">
            <div className="text-[22px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {isCancelMode && !isModifyModeActive ? '취소할 좌석' : '선택 좌석'} <span className="text-blue-500 font-extrabold">{cartSeats.size}</span>
              {!isCancelMode && <span className="text-gray-300 dark:text-gray-600 font-medium text-lg">/ 4</span>}
            </div>
            {cartSeats.size > 0 && (
              <button
                onClick={() => {
                  if (isCancelMode && !isModifyModeActive) {
                    setSelectedSeatsToCancel(new Set());
                  } else if (isModifyModeActive) {
                    setSelectedSeatsToCancel(new Set(initialSeats));
                    setSelectedSeats(new Set());
                  } else {
                    setSelectedSeats(new Set());
                  }
                }}
                className="text-[16px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                전체삭제
              </button>
            )}
          </div>

          {cartSeats.size === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 py-20">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <p className="font-medium text-lg">선택된 좌석이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col animate-fade-in pb-4">
              {Array.from(cartSeats).map(seatId => {
                const { grade, price } = getSeatInfo(seatId);

                const gradeDotColors: Record<string, string> = {
                  'VIP': 'grade-dot-vip',
                  'R': 'grade-dot-r',
                  'S': 'grade-dot-s',
                  'A': 'grade-dot-a',
                };
                const dotClass = gradeDotColors[grade] || 'bg-gray-400';

                return (
                  <div
                    key={seatId}
                    className="flex justify-between items-center p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 group hover:border-gray-200 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      {isModifyModeActive && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {initialSeats.includes(seatId)
                            ? `${initialSchedule?.date} ${initialSchedule?.time}`
                            : `${confirmedSchedule?.date} ${confirmedSchedule?.time}`}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${dotClass}`}></span>
                        <span className="font-black text-gray-900 dark:text-white text-base">{grade}석</span>
                        {isModifyModeActive && initialSeats.includes(seatId) && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold">
                            기존
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium ml-5">{getDetailedSeatInfo(seatId)}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-black text-lg text-gray-900 dark:text-white tracking-tight">
                        {isWaitlistMode ? (
                          <span className="text-blue-600">대기 {(seatId.charCodeAt(0) + (parseInt(seatId.slice(1)) || 0)) * 2 % 45 + 1}명</span>
                        ) : (
                          `${price.toLocaleString()}원`
                        )}
                      </span>

                      <button
                        onClick={() => {
                          if (isCancelMode && !isModifyModeActive) {
                            setSelectedSeatsToCancel(new Set([...selectedSeatsToCancel].filter(s => s !== seatId)));
                          } else if (isModifyModeActive) {
                            if (initialSeats.includes(seatId)) {
                              setSelectedSeatsToCancel(new Set([...selectedSeatsToCancel, seatId]));
                            } else {
                              setSelectedSeats(new Set([...selectedSeats].filter(s => s !== seatId)));
                            }
                          } else {
                            setSelectedSeats(new Set([...selectedSeats].filter(s => s !== seatId)));
                          }
                        }}
                        className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors p-1"
                        aria-label="삭제"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Checkout Bar at bottom of right panel */}
      {scheduleId && ((isCancelMode && !isModifyModeActive ? selectedSeatsToCancel.size > 0 : selectedSeats.size > 0) || isModifyModeActive) && !isModifyingSchedule && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-20 animate-slide-up">
          {isCancelMode && !isModifyModeActive ? (
            <>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">취소할 좌석</span>
                <span className="text-2xl font-extrabold text-red-600">
                  {effectiveSeatsToCancel.size}개
                </span>
              </div>
              <button
                onClick={() => {
                  onError('취소 완료', '취소가 완료되었습니다. (임시 동작)');
                  onClose();
                }}
                className="px-10 py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20"
              >
                선택한 좌석 취소
              </button>
            </>
          ) : isModifyModeActive ? (
            <>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">취소 {effectiveSeatsToCancel.size}개 / 추가 {selectedSeats.size}개</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  변경 사항 저장
                </span>
              </div>
              <button
                onClick={async (e) => {
                  if (!e.isTrusted) {
                    window.location.href = '/blocked';
                    return;
                  }
                  if (selectedSeats.size > 0) {
                    await handleNextStep(e);
                  } else {
                    onError('예약 변경', '예약 변경이 완료되었습니다. (임시 동작)');
                    onClose();
                  }
                }}
                className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20"
              >
                {selectedSeats.size > 0 ? (isWaitlistMode ? '대기하기' : '인원 선택') : '변경 사항 저장'}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">
                  {isWaitlistMode ? '선택된 좌석 수' : '총 결제 금액'}
                </span>
                <span className="text-2xl font-extrabold text-blue-600">
                  {isWaitlistMode
                    ? `${selectedSeats.size}개`
                    : `${Array.from(selectedSeats).reduce((sum, seatId) => sum + getSeatInfo(seatId).price, 0).toLocaleString()}원`}
                </span>
              </div>
              <button
                onClick={(e) => {
                  if (!e.isTrusted) {
                    window.location.href = '/blocked';
                    return;
                  }
                  handleNextStep(e);
                }}
                className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20"
              >
                {isWaitlistMode ? '예매 대기 신청' : '인원 선택'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};
