'use client';

import React, { useState } from 'react';
import { useWaitlistBookings, useCancelWaitlist } from '@/src/features/mypage/api/useMyPageData';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { Modal } from '@/src/shared/components/Modal';
import { CancellationDetailView } from '@/src/features/cancellation/ui/CancellationDetailView';
import { MobileWaitlistCard } from '@/src/shared/components/MobileWaitlistCard';
import { WaitlistSeatCard } from '@/src/shared/components/WaitlistSeatCard';

import { WaitlistDetailView } from './WaitlistDetailView';

export const WaitlistManagementView = () => {
  const { data: waitlist, isLoading } = useWaitlistBookings();

  // Cancel Flow State (개별 좌석 단위)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [selectedSeatForCancel, setSelectedSeatForCancel] = useState<any | null>(null);

  // Mobile Detail Flow State
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);

  // Cancellation Flow State
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const handleOpenDetail = (item: any) => {
    setSelectedDetailItem(item);
    if (window.innerWidth < 768) {
      setIsMobileDetailOpen(true);
    } else {
      handleOpenCancelModal(item);
    }
  };

  const handleOpenCancelModal = (seat: any) => {
    setSelectedSeatForCancel(seat);
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setTimeout(() => {
      setSelectedSeatForCancel(null);
    }, 300);
  };

  const cancelWaitlistMutation = useCancelWaitlist();

  const handleConfirmCancel = () => {
    setIsWarningModalOpen(true);
  };

  const handleExecuteCancel = async () => {
    if (!selectedSeatForCancel) return;
    try {
      await cancelWaitlistMutation.mutateAsync(selectedSeatForCancel.id);
      setIsWarningModalOpen(false);
      handleCloseCancelModal();
    } catch (err) {
      console.error(err);
      alert('취소 처리 중 오류가 발생했습니다.');
      setIsWarningModalOpen(false);
    }
  };


  // 모든 좌석을 flat하게 펼쳐서 공연 정보를 붙이고, 대기 순번으로 정렬
  const flatSeats = React.useMemo(() => {
    if (!waitlist) return [];
    const seats: any[] = [];
    waitlist.forEach((item) => {
      item.seats?.forEach((seat: any) => {
        seats.push({
          ...seat,
          eventTitle: item.title,
          eventDate: item.performanceDate,
          eventImage: item.imageUrl,
          parentItem: item, // 취소 시 부모 참조용
        });
      });
    });
    // 대기 순번 오름차순 (배정 완료 = 0 이하가 가장 앞)
    seats.sort((a, b) => a.waitlistNumber - b.waitlistNumber);
    return seats;
  }, [waitlist]);

  // 3개 그룹으로 분류
  const offeredSeats = flatSeats.filter((s) => s.waitlistNumber <= 0);
  const soonSeats = flatSeats.filter((s) => s.waitlistNumber >= 1 && s.waitlistNumber <= 5);
  const waitingSeats = flatSeats.filter((s) => s.waitlistNumber > 5);

  const renderSeatCard = (seat: any) => {
    return (
      <WaitlistSeatCard
        key={seat.id}
        seat={seat}
        onSelectOffer={setSelectedOfferId}
        onCancel={handleOpenCancelModal}
      />
    );
  };

  // 섹션 헤더 렌더링 헬퍼
  const renderSectionHeader = (emoji: string, title: string, count: number, color: string) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="text-lg">{emoji}</span>
      <span className={`text-sm font-extrabold ${color}`}>{title}</span>
      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );

  return (
    <div className="w-full animate-fade-in relative">
      <div className="mb-6 flex items-center justify-between">
        <Text typography="t5" color="secondary">
          총 <span className="font-bold text-blue-600">{flatSeats.length}</span>건의 좌석 대기 중
        </Text>
      </div>

      <div className="flex flex-col gap-6 pb-20">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-full h-20 bg-gray-100 animate-pulse rounded-2xl" />
          ))
        ) : flatSeats.length > 0 ? (
          <>
            <div className="flex flex-col gap-2.5">
              {flatSeats.map((seat) => renderSeatCard(seat))}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-16 md:py-24 px-6 bg-gray-50 rounded-2xl border border-gray-200 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" textAlign="center" className="mb-2 break-keep">
              취소표 대기 내역이 없습니다.
            </Text>
            <Text typography="t6" color="tertiary" textAlign="center" className="break-keep max-w-[260px] md:max-w-none">
              원하시는 공연의 취소표 대기를 걸어보세요!
            </Text>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        title="대기 취소"
        description="이 좌석의 대기를 취소하시겠습니까?"
        confirmText="취소하기"
        cancelText="닫기"
        isConfirmDisabled={false}
      >
        {selectedSeatForCancel && (
          <div className="flex items-center gap-3 p-3 mt-2 rounded-lg bg-gray-50 border border-gray-100 text-left">
            <span className="shrink-0 px-2.5 py-1 bg-purple-100 text-purple-600 text-[11px] font-extrabold rounded-md border border-purple-200">
              대기 {selectedSeatForCancel.waitlistNumber}번
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-gray-800 truncate">{selectedSeatForCancel.info}</span>
              <span className="text-[11px] text-gray-400 truncate">{selectedSeatForCancel.eventTitle}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* 경고 모달 (재차 확인) */}
      <Modal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        onCancel={() => setIsWarningModalOpen(false)}
        onConfirm={handleExecuteCancel}
        title="대기 취소 경고"
        description={'취소 시 현재 대기 순번이 사라지며 복구할 수 없습니다.\n정말 취소하시겠습니까?'}
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

      {/* 모바일 전용 상세 오버레이 뷰 */}
      {isMobileDetailOpen && selectedDetailItem && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto md:hidden">
          <WaitlistDetailView
            item={selectedDetailItem}
            onBack={() => setIsMobileDetailOpen(false)}
            onOpenPayment={(id) => {
              setIsMobileDetailOpen(false); // 오버레이 닫고 결제 뷰 띄우기
              setSelectedOfferId(id);
            }}
          />
        </div>
      )}
    </div>
  );
};
