'use client';

import React, { useState } from 'react';
import { useWaitlistBookings, useCancelWaitlist } from '@/src/features/mypage/api/useMyPageData';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { Modal } from '@/src/shared/components/Modal';
import { CancellationDetailView } from '@/src/features/cancellation/ui/CancellationDetailView';

export const WaitlistManagementView = () => {
  const { data: waitlist, isLoading } = useWaitlistBookings();

  // Cancel Flow State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [selectedWaitlistForCancel, setSelectedWaitlistForCancel] = useState<any | null>(null);

  // Cancellation Flow State
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const handleOpenCancelModal = (item: any) => {
    setSelectedWaitlistForCancel(item);
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setTimeout(() => {
      setSelectedWaitlistForCancel(null);
    }, 300);
  };

  const cancelWaitlistMutation = useCancelWaitlist();

  const handleConfirmCancel = () => {
    setIsWarningModalOpen(true);
  };

  const handleExecuteCancel = async () => {
    if (!selectedWaitlistForCancel) return;
    try {
      const cancelPromises = selectedWaitlistForCancel.seats.map((seat: any) =>
        cancelWaitlistMutation.mutateAsync(seat.id)
      );
      await Promise.all(cancelPromises);
      // alert 띄우지 않음
      setIsWarningModalOpen(false);
      handleCloseCancelModal();
    } catch (err) {
      console.error(err);
      alert('취소 처리 중 오류가 발생했습니다.');
      setIsWarningModalOpen(false);
    }
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
                className="relative w-full max-w-[320px] flex flex-col rounded-[24px] overflow-hidden shadow-2xl shadow-black/20 bg-zinc-900"
              >
                {/* 포스터 배경 (Full Size) */}
                <div className="absolute inset-0 w-full h-full">
                  <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="!rounded-none max-w-full object-cover" />
                </div>

                {/* 그라데이션 오버레이 (텍스트 가독성) */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-[#0f172a]/20 pointer-events-none z-10"></div>

                {/* 컨텐츠 영역 */}
                <div className="relative z-20 w-full h-full flex flex-col p-6 justify-between min-h-[460px] gap-4">
                  {/* 상단 뱃지 */}
                  <div className="flex justify-between items-start w-full shrink-0">
                    <span className="px-3 py-1.5 bg-purple-500/30 text-purple-200 border border-purple-400/40 rounded-lg text-xs font-extrabold tracking-widest backdrop-blur-md shadow-lg shadow-purple-500/20">
                      취소표 대기중
                    </span>
                  </div>

                  {/* 하단 텍스트 및 정보 박스 */}
                  <div className="flex flex-col gap-4 w-full mt-auto">
                    <div className="flex flex-col drop-shadow-lg">
                      <Text typography="t3" fontWeight="extrabold" className="text-white w-full truncate mb-1 drop-shadow-xl">
                        {item.title}
                      </Text>
                    </div>

                    {/* Glassmorphism Info Box */}
                    <div className="w-full bg-white/5 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                      <div className="flex flex-col gap-1.5 text-xs mb-1 px-1">
                        <span className="text-gray-300/90 font-bold">콘서트 일시</span>
                        <span className="text-white font-extrabold tracking-wide">
                          {new Date(item.performanceDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-1" />

                      {/* 다중 좌석 대기열 */}
                      <div className="flex flex-col gap-2.5">
                        {item.seats && item.seats.map((seat: any) => {
                          const progress = Math.max(5, 100 - (seat.waitlistNumber * 2));

                          // 혼잡도/대기열 색상
                          let badgeClass = '';
                          let barClass = '';

                          if (seat.waitlistNumber <= 0) {
                            badgeClass = 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse border-rose-400';
                            barClass = 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]';
                          } else if (seat.waitlistNumber <= 5) {
                            badgeClass = 'bg-blue-500/30 text-blue-200 border-blue-400/50 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
                            barClass = 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.8)]';
                          } else if (seat.waitlistNumber <= 10) {
                            badgeClass = 'bg-green-500/30 text-green-200 border-green-400/50 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
                            barClass = 'bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_4px_rgba(34,197,94,0.8)]';
                          } else if (seat.waitlistNumber <= 15) {
                            badgeClass = 'bg-yellow-500/30 text-yellow-200 border-yellow-400/50 shadow-[0_0_8px_rgba(234,179,8,0.4)]';
                            barClass = 'bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_4px_rgba(234,179,8,0.8)]';
                          } else {
                            badgeClass = 'bg-red-500/30 text-red-200 border-red-400/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
                            barClass = 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_4px_rgba(239,68,68,0.8)]';
                          }

                          const isOffered = seat.waitlistNumber <= 0;

                          return (
                            <div key={seat.id} className={`flex flex-col gap-2.5 bg-black/40 p-3 rounded-xl border ${isOffered ? 'border-rose-500/70 shadow-lg shadow-rose-500/20' : 'border-white/5 hover:border-white/10 transition-colors'}`}>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-100 font-bold tracking-wide truncate max-w-[130px]">{seat.info}</span>
                                <div className="flex flex-col items-end gap-1.5 w-[60px]">
                                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black whitespace-nowrap ${badgeClass}`}>
                                    {isOffered ? '배정됨!' : `대기 ${seat.waitlistNumber}번`}
                                  </span>
                                  {!isOffered && (
                                    <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isOffered && (
                                <button
                                  onClick={() => setSelectedOfferId(seat.id)}
                                  className="w-full py-2 mt-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-lg text-xs font-bold shadow-lg shadow-rose-500/40 transition-all"
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
                    <div className="flex gap-3 mt-1 w-full">
                      <button
                        onClick={() => handleOpenCancelModal(item)}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-xl text-white text-sm font-extrabold rounded-xl border border-white/20 transition-all shadow-lg hover:shadow-xl"
                      >
                        취소하기
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


      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        title="대기 전체 취소"
        description="해당 공연의 대기 내역을 모두 취소하시겠습니까?"
        confirmText="전체 취소"
        cancelText="닫기"
        isConfirmDisabled={false}
      >
        <div className="flex flex-col gap-2 mt-2 max-h-[300px] overflow-y-auto px-1">
          {selectedWaitlistForCancel?.seats.map((seat: any) => {
            return (
              <div
                key={seat.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 text-left"
              >
                <span className="shrink-0 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-[11px] font-extrabold rounded-md border border-purple-200 dark:border-purple-800/50">
                  대기 {seat.waitlistNumber}번
                </span>
                <span className="text-[14px] font-bold text-gray-800 dark:text-gray-200 truncate">
                  {seat.info}
                </span>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* 경고 모달 (재차 확인) */}
      <Modal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        onCancel={() => setIsWarningModalOpen(false)}
        onConfirm={handleExecuteCancel}
        title="대기 취소 경고"
        description="취소 시 현재 대기 순번이 모두 사라지며 복구할 수 없습니다.\n정말 취소하시겠습니까?"
        confirmText="취소 진행"
        cancelText="돌아가기"
        isConfirmDisabled={false}
      />

      {selectedOfferId && (
        <CancellationDetailView
          cancellationId={selectedOfferId}
          onClose={() => setSelectedOfferId(null)}
        />
      )}
    </div>
  );
};
