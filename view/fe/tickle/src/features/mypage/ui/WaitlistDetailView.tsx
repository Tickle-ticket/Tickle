'use client';

import React, { useState } from 'react';
import { useCancelWaitlist, type WaitlistBookingData } from '@/src/features/mypage/api/useMyPageData';
import { Modal } from '@/src/shared/components/Modal';
import { useToast } from '@/src/shared/providers/ToastProvider';
import { useRouter } from 'next/navigation';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { Text } from '@/src/shared/components/Text';

export interface WaitlistDetailViewProps {
  item: WaitlistBookingData;
  onBack?: () => void;
  onOpenPayment?: (offerId: string) => void;
}

export const WaitlistDetailView = ({ item, onBack, onOpenPayment }: WaitlistDetailViewProps) => {
  const router = useRouter();
  const { showToast } = useToast();
  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const cancelWaitlistMutation = useCancelWaitlist();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleConfirmCancel = () => {
    setIsWarningModalOpen(true);
  };

  const handleExecuteCancel = async () => {
    setIsCanceling(true);
    try {
      const cancelPromises = item.seats.map((seat) =>
        cancelWaitlistMutation.mutateAsync(seat.id)
      );
      await Promise.all(cancelPromises);
      setIsWarningModalOpen(false);
      setIsCancelModalOpen(false);
      setIsCanceling(false);
      handleBack();
    } catch (err) {
      console.error(err);
      showToast('취소 처리 중 오류가 발생했습니다.');
      setIsCanceling(false);
      setIsWarningModalOpen(false);
    }
  };

  if (!item) return null;

  return (
    <div className="w-full min-h-screen bg-zinc-950 pb-[180px] md:pb-[220px] text-white">
      {/* 상단 네비게이션 헤더 */}
      <div className="sticky top-0 z-10 bg-surface-inverse/80 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <button onClick={handleBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-surface/10 active:bg-surface/20 transition-colors">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-inverse-muted">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="font-extrabold text-white text-[17px] tracking-tight">취소표 대기 상세</span>
        <div className="w-9"></div>
      </div>

      <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* 포스터 및 기본 정보 */}
        <div className="flex gap-4">
          <div className="w-[100px] h-[140px] shrink-0 rounded-xl overflow-hidden shadow-lg border border-white/10">
            <InfoPoster src={item.imageUrl} alt={item.title} width="100%" height="100%" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="px-2 py-1 bg-accent/20 text-accent-light border border-accent/30 rounded text-[10px] font-black w-fit mb-2">
              취소표 대기중
            </span>
            <Text typography="t4" fontWeight="extrabold" className="text-white mb-1 leading-snug">
              {item.title}
            </Text>
            <Text typography="t6" className="text-content-muted font-medium mt-1">
              {new Date(item.performanceDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </div>
        </div>

        {/* 대기중인 좌석 정보 */}
        <div className="bg-surface/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <Text typography="t6" fontWeight="bold" className="text-content-muted">대기중인 좌석 목록</Text>
          <div className="flex flex-col gap-2">
            {item.seats && item.seats.map((seat) => {
              const progress = Math.max(5, 100 - (seat.waitlistNumber * 2));
              let badgeClass = '';
              let barClass = '';

              if (seat.waitlistNumber <= 0) {
                badgeClass = 'bg-highlight text-white';
                barClass = 'bg-gradient-to-r from-rose-600 to-rose-400';
              } else if (seat.waitlistNumber <= 5) {
                badgeClass = 'bg-primary/30 text-primary-light border border-primary/50';
                barClass = 'bg-gradient-to-r from-blue-600 to-blue-400';
              } else if (seat.waitlistNumber <= 10) {
                badgeClass = 'bg-success/30 text-success-light border border-success/50';
                barClass = 'bg-gradient-to-r from-green-600 to-green-400';
              } else {
                badgeClass = 'bg-warning/30 text-warning-light border border-warning/50';
                barClass = 'bg-gradient-to-r from-yellow-600 to-yellow-400';
              }

              const isOffered = seat.waitlistNumber <= 0;

              return (
                <div key={seat.id} className={`flex flex-col bg-black/40 p-3 rounded-xl border ${isOffered ? 'border-danger/50' : 'border-white/5'}`}>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-content-inverse-muted font-bold">{seat.info}</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-black ${badgeClass}`}>
                      {isOffered ? '배정됨!' : `대기 ${seat.waitlistNumber}번`}
                    </span>
                  </div>
                  {!isOffered ? (
                    <div className="w-full h-1.5 bg-surface/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenPayment && onOpenPayment(seat.id)}
                      className="mt-2 w-full py-2.5 bg-highlight hover:bg-danger-hover active:bg-danger-hover text-white text-[13px] font-extrabold rounded-lg transition-all shadow-lg shadow-rose-600/30"
                    >
                      상세 확인 및 결제
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 고정 액션 버튼 */}
      <div className="fixed bottom-[70px] md:bottom-[100px] left-0 right-0 p-4 bg-surface-inverse/90 backdrop-blur-md border-t border-white/10 z-20 pb-safe">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="w-full py-4 bg-surface/10 hover:bg-surface/20 active:bg-surface/30 text-white font-extrabold rounded-[14px] transition-colors text-[15px] border border-white/20"
          >
            대기 전체 취소하기
          </button>
        </div>
      </div>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onCancel={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="대기 취소"
        description="정말 이 공연의 모든 예매 대기를 취소하시겠습니까?"
        confirmText="전체 취소"
        cancelText="닫기"
      />

      <Modal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        onCancel={() => setIsWarningModalOpen(false)}
        onConfirm={handleExecuteCancel}
        title="⚠️ 취소 경고"
        description="취소 시 대기 순번이 초기화되며 복구할 수 없습니다. 계속 진행하시겠습니까?"
        confirmText={isCanceling ? "취소 중..." : "확인 및 취소"}
        cancelText="돌아가기"
        isLoading={isCanceling}
      />
    </div>
  );
};
