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
  maxSelectable: number;
  getSeatInfo: (seatId: string) => { priceGrade: string; price: number; waitingCount?: number };
  getDetailedSeatInfo: (seatId: string) => string;
  handleNextStep: (e: React.MouseEvent) => void;
  onClose: () => void;
  effectiveSeatsToCancel: Set<string>;
  scheduleId: string | null;
  onError: (title: string, message: string) => void;
  isSubmitting?: boolean;
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
  maxSelectable,
  getSeatInfo,
  getDetailedSeatInfo,
  handleNextStep,
  onClose,
  effectiveSeatsToCancel,
  scheduleId,
  onError,
  isSubmitting = false
}) => {

  return (
    <>
      {(!confirmedSchedule || isModifyingSchedule) ? (
        // Phase 1: Schedule Selection
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 relative">
          {confirmedSchedule && isModifyingSchedule && (
            <button
              onClick={() => {
                setIsModifyingSchedule(false);
                setSelectedDate(confirmedSchedule.date);
                setSelectedTime(confirmedSchedule.time);
              }}
              className="absolute top-5 right-5 text-content-muted hover:text-content-secondary:text-content-inverse-muted transition-colors p-2 rounded-full hover:bg-surface-muted:bg-surface-inverse"
              aria-label="변경 취소"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          <div className="flex flex-col pr-12">
            <h2 className="text-xl sm:text-2xl font-extrabold text-content tracking-tight">관람 일시 선택</h2>
          </div>

          {/* Date Selection */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold text-content-secondary flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center text-[11px] font-bold">1</span>
              날짜 선택
            </h3>
            <div className="flex justify-center w-full">
              <div className="w-full flex justify-center scale-[0.82] sm:scale-[0.93] origin-top -mb-[40px] sm:-mb-[25px]">
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
                  className="w-full max-w-[340px] shadow-sm border border-line-subtle"
                />
              </div>
            </div>
          </div>

          {/* Time Selection */}
          <div className="flex flex-col gap-3 border-t border-line-subtle pt-4 pb-4 z-10">
            <h3 className="text-[15px] font-bold text-content-secondary flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center text-[11px] font-bold">2</span>
              회차 선택
            </h3>
            {selectedDate ? (
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {eventDetail.schedules.find((s: any) => s.date === selectedDate)?.times.map((timeObj: any, idx: number) => {
                  const now = Date.now();
                  const isPast = new Date(timeObj.startAt).getTime() < now;

                  // 예매: salesOpenAt ~ salesCloseAt 범위 내인지 확인
                  const salesOpen = timeObj.salesOpenAt ? new Date(timeObj.salesOpenAt).getTime() : 0;
                  const salesClose = timeObj.salesCloseAt ? new Date(timeObj.salesCloseAt).getTime() : Infinity;
                  const isBookingSaleActive = now >= salesOpen && now <= salesClose;

                  // 취소표 대기: cancellationWaitOpenAt ~ salesCloseAt 범위 내인지 확인
                  const waitlistOpen = timeObj.cancellationWaitOpenAt ? new Date(timeObj.cancellationWaitOpenAt).getTime() : 0;
                  const isWaitlistActive = now >= waitlistOpen && now <= salesClose;

                  const isSaleActive = isWaitlistMode ? isWaitlistActive : isBookingSaleActive;
                  const isDisabled = isPast || !isSaleActive;

                  return (
                  <button
                    key={timeObj.time}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
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
                    className={`w-[calc(50%-4px)] min-w-[125px] h-[44px] px-3 rounded-xl border-2 font-bold transition-all text-center flex items-center justify-center ${
                      isDisabled
                        ? 'border-line bg-surface-subtle text-content-muted cursor-not-allowed opacity-50'
                        : selectedTime === timeObj.time
                        ? 'border-primary bg-primary text-white shadow-md shadow-blue-600/20 transform scale-[1.02]'
                        : 'border-line bg-surface text-content-secondary hover:border-primary hover:bg-primary-subtle:bg-surface-inverse'
                      }`}
                  >
                    <span className="text-[15px]">{timeObj.time}</span>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-7 bg-surface-subtle rounded-xl border border-dashed border-line-strong animate-fade-in">
                <p className="text-content-tertiary font-medium text-[14px]">관람 일자를 먼저 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ═══ MOBILE/TABLET: Floating Overlay on Map ═══ */}
          <div className="lg:hidden flex flex-col justify-between h-full p-3 pb-[100px] animate-fade-in z-10 pointer-events-none">
            {/* Top: Schedule Pill + Seat Count (floating) */}
            <div className="flex flex-col gap-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-surface/95 backdrop-blur-md px-3 py-2 rounded-full border border-line/80 shadow-lg min-w-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span className="text-sm font-bold text-content truncate">
                    {selectedDate} {selectedTime}
                  </span>
                  <span className="text-content-muted">·</span>
                  <span className="text-sm font-bold text-primary shrink-0">
                    {isModifyModeActive ? selectedSeats.size : cartSeats.size}{!isCancelMode && `/${maxSelectable}`}
                  </span>
                </div>
                {(!isCancelMode || isModifyModeActive) && (
                  <button
                    onClick={() => setIsModifyingSchedule(true)}
                    className="text-xs font-bold px-3 py-2 rounded-full bg-surface/95 backdrop-blur-md text-content-secondary border border-line/80 shadow-lg whitespace-nowrap shrink-0 hover:bg-surface-subtle transition-colors"
                  >
                    변경
                  </button>
                )}
                {isCancelMode && !isModifyModeActive && (
                  <button
                    onClick={() => setIsModifyModeActive(true)}
                    className="text-xs font-bold text-primary bg-primary-subtle/95 backdrop-blur-md px-3 py-2 rounded-full border border-primary-light/80 shadow-lg whitespace-nowrap shrink-0"
                  >
                    예약변경
                  </button>
                )}
              </div>
            </div>

            {/* Bottom: Selected Seat Chips (floating above checkout bar) */}
            <div className="pointer-events-auto mb-1">
              {cartSeats.size === 0 ? (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-surface/90 backdrop-blur-md rounded-2xl shadow-lg border border-line/60">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-content-muted opacity-60">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <p className="text-xs font-medium text-content-muted">지도에서 좌석을 터치하세요</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 w-full pb-1 px-1 justify-start">
                  {Array.from(cartSeats).map(seatId => {
                    const { priceGrade, price } = getSeatInfo(seatId);
                    const gradeDotColors: Record<string, string> = {
                      'VIP': 'grade-dot-vip', 'R': 'grade-dot-r', 'S': 'grade-dot-s', 'A': 'grade-dot-a',
                    };
                    const dotClass = gradeDotColors[priceGrade] || 'bg-surface-active';
                    return (
                      <div key={seatId} className="flex items-center gap-1.5 shrink-0 bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-line/60">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}></span>
                        <span className="text-xs font-bold text-content">{priceGrade}</span>
                        <span className="text-[11px] text-content-tertiary whitespace-nowrap">{getDetailedSeatInfo(seatId)}</span>
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
                          className="text-content-muted hover:text-content-secondary:text-content-inverse-muted transition-colors ml-0.5"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═══ DESKTOP: Original Card Layout ═══ */}
          <div className="hidden lg:flex flex-1 overflow-y-auto p-8 flex-col gap-6 pb-32 animate-fade-in [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex justify-between items-center bg-surface p-5 rounded-2xl border border-line shadow-sm mb-4 shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-content-tertiary font-bold uppercase tracking-wider">선택된 일시</span>
                <span className="text-xl font-extrabold text-content flex items-center gap-2">
                  {selectedDate} <span className="text-content-muted">|</span> {selectedTime}
                </span>
              </div>
              {(!isCancelMode || isModifyModeActive) && (
                <button
                  onClick={() => setIsModifyingSchedule(true)}
                  className="text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-content-secondary bg-surface-muted hover:bg-surface-active:bg-surface-active"
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
                  className="text-sm font-bold text-primary bg-primary-subtle px-4 py-2.5 rounded-xl hover:bg-primary-light:bg-primary-hover/50 transition-colors flex items-center gap-2"
                >
                  예약 변경 모드로 전환
                </button>
              )}
            </div>

            <div className="flex justify-between items-center border-b border-line-subtle pb-4 shrink-0">
              <div className="text-[22px] font-bold text-content flex items-center gap-2">
                {isCancelMode && !isModifyModeActive ? '취소할 좌석' : '선택 좌석'} <span className="text-primary font-extrabold">{isModifyModeActive ? selectedSeats.size : cartSeats.size}</span>
                {!isCancelMode && <span className="text-content-muted font-medium text-lg">/ {maxSelectable}</span>}
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
                  className="text-[16px] font-medium text-content-muted hover:text-content-secondary:text-content-muted transition-colors"
                >
                  전체삭제
                </button>
              )}
            </div>

            {cartSeats.size === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-content-muted gap-4 py-20">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <p className="font-medium text-lg">선택된 좌석이 없습니다</p>
              </div>
            ) : (
              <div className="flex flex-col animate-fade-in pb-4">
                {Array.from(cartSeats).map(seatId => {
                  const { priceGrade, price } = getSeatInfo(seatId);
                  const gradeDotColors: Record<string, string> = {
                    'VIP': 'grade-dot-vip', 'R': 'grade-dot-r', 'S': 'grade-dot-s', 'A': 'grade-dot-a',
                  };
                  const dotClass = gradeDotColors[priceGrade] || 'bg-surface-active';
                  return (
                    <div key={seatId} className="flex justify-between items-center p-4 rounded-xl border border-line-subtle bg-surface-subtle group hover:border-line:border-line-strong transition-colors">
                      <div className="flex flex-col gap-1">
                        {isModifyModeActive && (
                          <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider">
                            {initialSeats.includes(seatId)
                              ? `${initialSchedule?.date} ${initialSchedule?.time}`
                              : `${confirmedSchedule?.date} ${confirmedSchedule?.time}`}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${dotClass}`}></span>
                          <span className="font-black text-content text-base">{priceGrade}석</span>
                          {isModifyModeActive && initialSeats.includes(seatId) && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-active text-content-secondary text-[10px] font-bold">
                              기존
                            </span>
                          )}
                        </div>
                        <span className="text-content-tertiary text-[13px] font-medium ml-5">{getDetailedSeatInfo(seatId)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-lg text-content tracking-tight">
                          {isWaitlistMode ? (
                            <span className="text-primary">대기 {getSeatInfo(seatId).waitingCount || 0}명</span>
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
                          className="text-content-muted hover:text-content-tertiary:text-content-muted transition-colors p-1"
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
        </>
      )}

      {/* Checkout Bar at bottom of right panel */}
      {scheduleId && ((isCancelMode && !isModifyModeActive ? selectedSeatsToCancel.size > 0 : selectedSeats.size > 0) || isModifyModeActive) && !isModifyingSchedule && (
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 bg-surface/95 lg:bg-surface:bg-surface-inverse backdrop-blur-md lg:backdrop-blur-none border-t border-line shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-20 animate-slide-up gap-3 pointer-events-auto">
          {isCancelMode && !isModifyModeActive ? (
            <>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-content-tertiary font-medium">취소할 좌석</span>
                <span className="text-xl sm:text-2xl font-extrabold text-danger">
                  {effectiveSeatsToCancel.size}개
                </span>
              </div>
              <button
                onClick={() => {
                  onError('취소 완료', '취소가 완료되었습니다. (임시 동작)');
                  onClose();
                }}
                className="px-6 sm:px-10 py-3 sm:py-4 bg-danger-hover text-white rounded-xl font-bold text-sm sm:text-lg hover:bg-danger-hover active:scale-95 transition-all shadow-md shadow-red-600/20 shrink-0"
              >
                선택한 좌석 취소
              </button>
            </>
          ) : isModifyModeActive ? (
            <>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm text-content-tertiary font-medium truncate">취소 {effectiveSeatsToCancel.size}개 / 추가 {selectedSeats.size}개</span>
                <span className="text-xl sm:text-2xl font-extrabold text-primary">
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
                disabled={isSubmitting}
                className={`px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all shadow-md shrink-0 ${
                  isSubmitting 
                    ? 'bg-surface-active text-white cursor-not-allowed shadow-none' 
                    : 'bg-primary text-white hover:bg-primary-hover active:scale-95 shadow-blue-600/20'
                }`}
              >
                {isSubmitting ? '처리 중...' : selectedSeats.size > 0 ? (isWaitlistMode ? '대기하기' : '인원 선택') : '변경 사항 저장'}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm text-content-tertiary font-medium">
                  {isWaitlistMode ? '선택된 좌석 수' : '총 결제 금액'}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-primary">
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
                disabled={isSubmitting}
                className={`px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg transition-all shadow-md shrink-0 ${
                  isSubmitting 
                    ? 'bg-surface-active text-white cursor-not-allowed shadow-none' 
                    : 'bg-primary text-white hover:bg-primary-hover active:scale-95 shadow-blue-600/20'
                }`}
              >
                {isSubmitting ? '처리 중...' : (isWaitlistMode ? '예매 대기 신청' : '인원 선택')}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};
