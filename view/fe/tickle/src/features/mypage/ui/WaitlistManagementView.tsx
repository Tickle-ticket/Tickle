'use client';

import React, { useState } from 'react';
import { useWaitlistBookings, useCancelWaitlist } from '@/src/features/mypage/api/useMyPageData';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { Table } from '@/src/shared/components/Table';
import Button from '@/src/shared/components/Button';
import { Modal } from '@/src/shared/components/Modal';
import { QueueView } from '@/src/features/queue/ui/QueueView';
import { BookView } from '@/src/features/book/ui/BookView';
import { CancellationDetailView } from '@/src/features/cancellation/ui/CancellationDetailView';

export const WaitlistManagementView = () => {
  const { data: waitlist, isLoading } = useWaitlistBookings();
  
  // Cancel Flow State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedWaitlistForCancel, setSelectedWaitlistForCancel] = useState<any | null>(null);
  const [selectedSeatsToCancel, setSelectedSeatsToCancel] = useState<Set<string>>(new Set());

  // Modify Flow State
  const [modifyFlowState, setModifyFlowState] = useState<'NONE' | 'QUEUE' | 'BOOK'>('NONE');
  const [selectedWaitlistForModify, setSelectedWaitlistForModify] = useState<any | null>(null);
  const [admitToken, setAdmitToken] = useState<string | null>(null);

  // Cancellation Flow State
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const handleOpenCancelModal = (item: any) => {
    setSelectedWaitlistForCancel(item);
    setSelectedSeatsToCancel(new Set());
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setTimeout(() => {
      setSelectedWaitlistForCancel(null);
      setSelectedSeatsToCancel(new Set());
    }, 300);
  };

  const cancelWaitlistMutation = useCancelWaitlist();

  const handleConfirmCancel = async () => {
    try {
      const cancelPromises = Array.from(selectedSeatsToCancel).map(id => 
        cancelWaitlistMutation.mutateAsync(id)
      );
      await Promise.all(cancelPromises);
      alert('선택한 대기 내역이 취소되었습니다.');
    } catch (err) {
      console.error(err);
      alert('취소 처리 중 오류가 발생했습니다.');
    } finally {
      handleCloseCancelModal();
    }
  };

  const handleOpenModifyFlow = (item: any) => {
    // 좌석 정보에서 ID 추출 (예: "VIP석 1층 B구역 12열 14번" -> "VIP1")
    // 여기서는 임시로 인덱스를 사용해 매핑
    const parsedSeats = item.seats.map((s: any, i: number) => {
      const match = s.info.match(/([A-Z]+)석/);
      const grade = match ? match[1] : 'VIP';
      return `${grade}${i+1}`;
    });

    setSelectedWaitlistForModify({
      ...item,
      date: item.performanceDate.split('T')[0].replace(/-/g, '.'),
      time: item.performanceDate.split('T')[1].substring(0, 5),
      initialSeats: parsedSeats
    });
    setModifyFlowState('QUEUE');
  };

  const handleCloseModifyFlow = () => {
    setModifyFlowState('NONE');
    setTimeout(() => {
      setSelectedWaitlistForModify(null);
    }, 300);
  };

  return (
    <div className="w-full animate-fade-in relative">
      <div className="mb-6 flex items-center justify-between">
        <Text typography="t5" color="secondary">
          총 <span className="font-bold text-blue-600">{waitlist?.length || 0}</span>건의 취소표 대기 내역이 있습니다.
        </Text>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 justify-items-center">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-full h-[450px] bg-gray-100 animate-pulse rounded-2xl" />
          ))
        ) : waitlist && waitlist.length > 0 ? (
          waitlist.map((item) => {
            return (
              <div
                key={item.id}
                className="relative w-full max-w-[280px] flex flex-col rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white"
              >
                {/* 포스터 배경 (Full Size) */}
                <div className="absolute inset-0 w-full h-full">
                  <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="rounded-2xl max-w-full object-cover" />
                </div>

                {/* 그라데이션 오버레이 (텍스트 가독성) */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/95 via-[#0f172a]/70 to-[#0f172a]/10 pointer-events-none z-10"></div>

                {/* 컨텐츠 영역 */}
                <div className="relative z-20 w-full h-full flex flex-col p-5 justify-between min-h-[420px]">
                  {/* 상단 뱃지 */}
                  <div className="flex justify-between items-start w-full">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md text-[10px] font-extrabold tracking-wider backdrop-blur-md shadow-sm">
                      취소표 대기중
                    </span>
                  </div>

                  {/* 하단 텍스트 및 정보 박스 */}
                  <div className="flex flex-col gap-3 w-full mt-auto">
                    <div className="flex flex-col drop-shadow-md">
                      <span className="text-[10px] font-extrabold text-purple-400 tracking-[0.2em] mb-1 opacity-90">WAITING TICKET</span>
                      <Text typography="t4" fontWeight="bold" className="text-white w-full truncate mb-0.5 drop-shadow-lg">
                        {item.title}
                      </Text>
                      <Text typography="t7" fontWeight="medium" className="truncate text-gray-300 drop-shadow-md">
                        {item.venue}
                      </Text>
                      <Text typography="t7" className="text-purple-200 mt-1 font-medium">
                        {new Date(item.performanceDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </div>

                    {/* Glassmorphism Info Box */}
                    <div className="w-full bg-white/10 backdrop-blur-md rounded-xl p-3 flex flex-col gap-2 border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="text-gray-300/80 font-medium">신청일</span>
                        <span className="text-white font-bold tracking-wide">
                          {item.waitDate.replace(/-/g, '.')}
                        </span>
                      </div>
                      <div className="h-px w-full bg-white/10 mb-1" />
                      
                      {/* 다중 좌석 대기열 */}
                      <div className="flex flex-col gap-2">
                        {item.seats && item.seats.map((seat: any) => {
                          const progress = Math.max(5, 100 - (seat.waitlistNumber * 2));
                          
                          // 혼잡도/대기열 색상 (파-초-노-빨 순서 - 인원이 많을수록 빨간색)
                          let badgeClass = '';
                          let barClass = '';
                          
                          if (seat.waitlistNumber <= 0) {
                            badgeClass = 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse';
                            barClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]';
                          } else if (seat.waitlistNumber <= 5) {
                            badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.3)]';
                            barClass = 'bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.8)]';
                          } else if (seat.waitlistNumber <= 10) {
                            badgeClass = 'bg-green-500/20 text-green-300 border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)]';
                            barClass = 'bg-green-400 shadow-[0_0_4px_rgba(34,197,94,0.8)]';
                          } else if (seat.waitlistNumber <= 15) {
                            badgeClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.3)]';
                            barClass = 'bg-yellow-400 shadow-[0_0_4px_rgba(234,179,8,0.8)]';
                          } else {
                            badgeClass = 'bg-red-500/20 text-red-300 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
                            barClass = 'bg-red-400 shadow-[0_0_4px_rgba(239,68,68,0.8)]';
                          }

                          const isOffered = seat.waitlistNumber <= 0;

                          return (
                            <div key={seat.id} className={`flex flex-col gap-2 bg-black/20 p-2 rounded-lg border ${isOffered ? 'border-rose-500/50' : 'border-white/5'}`}>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-gray-200 font-medium truncate max-w-[110px]">{seat.info}</span>
                                <div className="flex flex-col items-end gap-1 w-[40px]">
                                  <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold whitespace-nowrap ${badgeClass}`}>
                                    {isOffered ? '배정됨!' : `${seat.waitlistNumber}번`}
                                  </span>
                                  {!isOffered && (
                                    <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isOffered && (
                                <button
                                  onClick={() => setSelectedOfferId(seat.id)}
                                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold shadow-lg shadow-rose-500/30 transition-colors"
                                >
                                  상세 확인 및 결제
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex gap-2 mt-2 w-full">
                      <button 
                        onClick={() => handleOpenCancelModal(item)}
                        className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md text-white text-[12px] font-bold rounded-xl border border-white/20 transition-colors shadow-sm"
                      >
                        취소하기
                      </button>
                      <button 
                        onClick={() => handleOpenModifyFlow(item)}
                        className="flex-1 py-2.5 bg-purple-500/80 hover:bg-purple-600/80 active:bg-purple-700/80 backdrop-blur-md text-white text-[12px] font-bold rounded-xl border border-purple-500/50 transition-colors shadow-sm"
                      >
                        대기 변경
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full w-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <path d="M5 22h14"></path>
              <path d="M5 2h14"></path>
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" className="mb-1">진행 중인 취소표 대기 내역이 없습니다.</Text>
            <Text typography="t6" color="tertiary">취소표 대기를 신청하시면 우선순위로 예매 기회를 얻을 수 있습니다.</Text>
          </div>
        )}
      </div>

      {modifyFlowState === 'QUEUE' && selectedWaitlistForModify && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <QueueView 
            sessionId={selectedWaitlistForModify.id || '1'} 
            scope="CANCELLATION_WAIT"
            onAdmitted={(token) => {
              setAdmitToken(token);
              setModifyFlowState('BOOK');
            }}
            onClose={() => setModifyFlowState('NONE')}
          />
        </div>
      )}

      {modifyFlowState === 'BOOK' && selectedWaitlistForModify && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <BookView 
            eventId={selectedWaitlistForModify.eventId}
            mode="WAITLIST" 
            initialSchedule={{ date: selectedWaitlistForModify.date, time: selectedWaitlistForModify.time }}
            initialSeats={selectedWaitlistForModify.initialSeats}
            initialModifyModeActive={true}
            admitToken={admitToken || undefined}
            onClose={() => {
              handleCloseModifyFlow();
            }} 
          />
        </div>
      )}

      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        title="대기 취소하기"
        description="취소할 대기 내역을 선택해 주세요."
        confirmText="선택 취소"
        cancelText="닫기"
        isConfirmDisabled={selectedSeatsToCancel.size === 0}
      >
        <div className="flex flex-col gap-3 mt-4">
          {selectedWaitlistForCancel?.seats.map((seat: any) => {
            const isSelected = selectedSeatsToCancel.has(seat.id);
            return (
              <div 
                key={seat.id} 
                onClick={() => {
                  setSelectedSeatsToCancel(prev => {
                    const next = new Set(prev);
                    if (next.has(seat.id)) next.delete(seat.id);
                    else next.add(seat.id);
                    return next;
                  });
                }}
                className={`flex justify-between items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                    : 'border-gray-100 hover:border-gray-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 dark:text-white text-[15px]">
                        {seat.info.split(' ')[0]}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 font-medium text-[12px]">
                        {seat.info.split(' ').slice(1).join(' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-purple-500 font-extrabold">대기 {seat.waitlistNumber}번</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {selectedOfferId && (
        <CancellationDetailView
          cancellationId={selectedOfferId}
          onClose={() => setSelectedOfferId(null)}
        />
      )}
    </div>
  );
};
