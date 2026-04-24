'use client';

import React, { useState, useEffect } from 'react';
import { useSeatData } from '@/src/features/book/api/useSeatData';
import { SSAFY_18 } from '@/src/shared/components/SSAFY_18';
import { PriceLegend } from '@/src/shared/components/PriceLegend';
import { InteractiveMapViewer } from '@/src/shared/components/InteractiveMapViewer';
import { Calendar } from '@/src/shared/components/Calendar';
import { useEventDetail } from '@/src/features/book/api/useEventDetail';
import { CustomCAPTCHA } from '@/src/shared/components/CustomCAPTCHA';
import type { SeatColor, SeatStatus } from '@/src/shared/components/types';
import { Modal } from '@/src/shared/components/Modal';

interface BookViewProps {
  onClose: () => void;
}

export const BookView = ({ onClose }: BookViewProps) => {
  const { data: eventDetail, isLoading: isEventLoading } = useEventDetail('1'); // 이벤트 ID 1로 하드코딩

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [isModifyingSchedule, setIsModifyingSchedule] = useState(false);
  const [confirmedSchedule, setConfirmedSchedule] = useState<{date: string, time: string} | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  
  // Clawptcha State
  const [isBotVerified, setIsBotVerified] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const handleCloseClick = () => {
    setIsExitModalOpen(true);
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    onClose();
  };

  const handleCancelExit = () => {
    setIsExitModalOpen(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scheduleId = confirmedSchedule ? `${confirmedSchedule.date}-${confirmedSchedule.time}` : null;
  const { data: seatAvailability, isLoading: isSeatsLoading } = useSeatData(scheduleId);

  if (isEventLoading || !eventDetail) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">예매 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  const seatsData: Record<string, { color?: string; status: SeatStatus; isSelected: boolean }> = {};

  if (seatAvailability) {
    Object.entries(seatAvailability).forEach(([seatId, info]) => {
      const status: SeatStatus = info.isAvailable ? 'selectable' : 'disabled';
      const isSelected = selectedSeats.has(seatId);
      seatsData[seatId] = { status, isSelected, color: info.grade.toLowerCase() };
    });
  }

  const getSeatInfo = (seatId: string) => {
    const grade = seatAvailability?.[seatId]?.grade || '일반';
    const price = eventDetail?.zonePrices.find(p => p.grade === grade)?.price || 0;
    return { grade, price };
  };

  const handleSeatClick = (id: string) => {
    const seatData = seatsData[id];
    if (!scheduleId || !seatData || seatData.status !== 'selectable') {
      return;
    }

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

  const SEAT_PRICES = eventDetail.zonePrices || [];

  if (!isBotVerified) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="z-10 animate-fade-in">
          <CustomCAPTCHA 
            onSuccess={(token) => {
              console.log('Bot verified!', token);
              setIsBotVerified(true);
            }} 
            onClose={handleCloseClick}
          />
        </div>

        <Modal
          isOpen={isExitModalOpen}
          onClose={handleCancelExit}
          title="대기열 퇴장"
          description="대기열에서 퇴장하시겠습니까? 다시 진입 시 대기 순서가 초기화됩니다."
          confirmText="퇴장하기"
          cancelText="계속 대기"
          onConfirm={handleConfirmExit}
          onCancel={handleCancelExit}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-white dark:bg-zinc-950 overflow-hidden animate-fade-in">
      {/* Header */}
      <header className="w-full shrink-0 bg-white dark:bg-zinc-950 p-6 shadow-sm flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCloseClick}
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
        <div className="text-sm font-medium text-gray-500 flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-4 py-2 rounded-full border border-gray-200 dark:border-zinc-700">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          예매 가능 시간 <span className="text-red-500 font-extrabold ml-1">{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main Content: Horizontal Split */}
      <div className="flex flex-1 w-full overflow-hidden">

        {/* Left Side: Map Area */}
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
                    오른쪽 패널에서 원하시는 날짜와 회차를 선택하시면<br/>좌석 예매가 활성화됩니다.
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
            <SSAFY_18
              seatsData={seatsData}
              onSeatClick={handleSeatClick}
            />
          </InteractiveMapViewer>

          <PriceLegend prices={SEAT_PRICES} />
        </div>

        {/* Right Side: Information & Checkout */}
        <div className="w-[40%] h-full flex flex-col bg-gray-50 dark:bg-zinc-950 relative">
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
                      enabledDates={eventDetail.schedules.map(s => s.date.replace(/\./g, '-'))}
                      selectedDate={selectedDate ? selectedDate.replace(/\./g, '-') : null}
                      onSelect={(date: Date) => {
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
                    {eventDetail.schedules.find(s => s.date === selectedDate)?.times.map((timeObj, idx) => (
                      <button
                        key={timeObj.time}
                        onClick={() => {
                          setSelectedTime(timeObj.time);
                          setConfirmedSchedule({ date: selectedDate!, time: timeObj.time });
                          setIsModifyingSchedule(false);
                          setSelectedSeats(new Set());
                        }}
                        className={`w-[calc(50%-4px)] min-w-[125px] px-3 py-2.5 rounded-xl border-2 font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                          selectedTime === timeObj.time
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20 transform scale-[1.02]'
                            : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <span className="text-[14px]">{idx + 1}회차 - {timeObj.time}</span>
                        <div className="flex flex-wrap gap-1.5 justify-center mt-0.5">
                          {timeObj.remainingSeats.map(seat => {
                            const gradeColors: Record<string, string> = {
                              'VIP': 'bg-pink-50 text-pink-600 border-pink-200',
                              'R': 'bg-yellow-50 text-yellow-600 border-yellow-200',
                              'S': 'bg-orange-50 text-orange-600 border-orange-200',
                              'A': 'bg-blue-50 text-blue-600 border-blue-200',
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
            <div className="flex-1 overflow-hidden p-8 flex flex-col gap-6 pb-32 animate-fade-in">
              <div className="flex justify-between items-center bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm mb-4 shrink-0">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">선택된 일시</span>
                  <span className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedDate} <span className="text-gray-300">|</span> {selectedTime}
                  </span>
                </div>
                <button 
                  onClick={() => setIsModifyingSchedule(true)}
                  className="text-sm font-bold text-gray-600 bg-gray-100 dark:bg-zinc-700 dark:text-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                  </svg>
                  일시 변경
                </button>
              </div>
              
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-4 shrink-0">
                <div className="text-[22px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  선택 좌석 <span className="text-blue-500 font-extrabold">{selectedSeats.size}</span>
                  <span className="text-gray-300 dark:text-gray-600 font-medium text-lg">/ 4</span>
                </div>
                {selectedSeats.size > 0 && (
                  <button 
                    onClick={() => setSelectedSeats(new Set())}
                    className="text-[16px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    전체삭제
                  </button>
                )}
              </div>

              {selectedSeats.size === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 py-20">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <p className="font-medium text-lg">선택된 좌석이 없습니다</p>
                </div>
              ) : (
                <div className="flex flex-col animate-fade-in pb-4">
                  {Array.from(selectedSeats).map(seatId => {
                    const { grade, price } = getSeatInfo(seatId);
                    
                    const gradeDotColors: Record<string, string> = {
                      'VIP': 'bg-[var(--seat-vip-top)]',
                      'R': 'bg-[var(--seat-r-top)]',
                      'S': 'bg-[var(--seat-s-top)]',
                      'A': 'bg-[var(--seat-a-top)]',
                    };
                    const dotClass = gradeDotColors[grade] || 'bg-gray-400';

                    return (
                      <div key={seatId} className="flex justify-between items-center py-3.5 border-b border-gray-100 dark:border-zinc-800">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${dotClass}`}></span>
                            <span className="font-black text-gray-900 dark:text-white text-base">{grade}석</span>
                          </div>
                          {/* We don't have exact row/col info like 1층 C구역, so we use seatId */}
                          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium ml-5">{seatId}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="font-black text-lg text-gray-900 dark:text-white tracking-tight">{price.toLocaleString()}원</span>
                          
                          <button 
                            onClick={() => {
                              setSelectedSeats(prev => {
                                const next = new Set(prev);
                                next.delete(seatId);
                                return next;
                              });
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
          {scheduleId && selectedSeats.size > 0 && !isModifyingSchedule && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-20 animate-slide-up">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-medium">총 결제 금액</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  {Array.from(selectedSeats).reduce((sum, seatId) => sum + getSeatInfo(seatId).price, 0).toLocaleString()}원
                </span>
              </div>
              <button className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20">
                결제하기
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isExitModalOpen}
        onClose={handleCancelExit}
        title="대기열 퇴장"
        description="대기열에서 퇴장하시겠습니까? 다시 진입 시 대기 순서가 초기화됩니다."
        confirmText="퇴장하기"
        cancelText="계속 대기"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </div>
  );
};
