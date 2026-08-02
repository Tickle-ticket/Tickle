'use client';

import React, { useState, useEffect } from 'react';
import {
  useWaitlistBookings,
  useCancelWaitlist,
  usePassCancellationOffer,
  type WaitlistBookingData,
  type FlatWaitlistSeat,
} from '@/src/features/mypage/api/useMyPageData';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/src/shared/components/Text';
import { InfoPoster } from '@/src/shared/components/InfoPoster';
import { Modal } from '@/src/shared/components/Modal';
import { useToast } from '@/src/shared/providers/ToastProvider';
import { CancellationDetailView } from '@/src/features/cancellation/ui/CancellationDetailView';
import { MobileWaitlistCard } from '@/src/shared/components/MobileWaitlistCard';
import { WaitlistSeatCard } from '@/src/shared/components/WaitlistSeatCard';

import { WaitlistDetailView } from './WaitlistDetailView';

export const WaitlistManagementView = () => {
  const queryClient = useQueryClient();
  const { data: waitlist, isLoading } = useWaitlistBookings();
  const { showToast } = useToast();

  // Cancel Flow State (개별 좌석 단위)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedSeatForCancel, setSelectedSeatForCancel] = useState<FlatWaitlistSeat | null>(null);

  // Mobile Detail Flow State
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<WaitlistBookingData | null>(null);

  // Cancellation Flow State
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  // 목록이 좌석 단위로 바뀌면서 호출부가 사라졌다(모바일 상세 오버레이도 함께
  // 도달 불가 상태다). 되살릴지 지울지는 화면 결정이라 그대로 두되, 데스크톱
  // 분기가 공연 그룹을 좌석용 취소 모달에 넘기던 것은 고쳤다 — 타입을 붙이자
  // 드러났고, 실행됐다면 scheduleId를 후보 id로 착각해 취소를 시도했을 것이다.
  const handleOpenDetail = (item: WaitlistBookingData) => {
    setSelectedDetailItem(item);
    setIsMobileDetailOpen(true);
  };

  const handleOpenCancelModal = (seat: FlatWaitlistSeat) => {
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
  const passOfferMutation = usePassCancellationOffer();

  // Pass Offer Flow State (배정 완료 좌석 취소)
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [selectedPassOfferId, setSelectedPassOfferId] = useState<string | null>(null);
  const [selectedPassSeat, setSelectedPassSeat] = useState<FlatWaitlistSeat | null>(null);

  const handleOpenPassModal = (cancellationId: string) => {
    const seat = flatSeats.find(s => String(s.cancellationOfferId) === cancellationId);
    setSelectedPassOfferId(cancellationId);
    setSelectedPassSeat(seat || null);
    setIsPassModalOpen(true);
  };

  const handleExecutePass = async () => {
    if (!selectedPassOfferId) return;
    try {
      await passOfferMutation.mutateAsync(selectedPassOfferId);
      setIsPassModalOpen(false);
      setSelectedPassOfferId(null);
      setSelectedPassSeat(null);
    } catch (err) {
      console.error(err);
      // 이 핸들러는 취소가 아니라 배정 기회를 넘기는(pass) 동작이다.
      showToast('넘기기 처리 중 오류가 발생했습니다.');
    }
  };

  const handleExecuteCancel = async () => {
    if (!selectedSeatForCancel) return;
    try {
      await cancelWaitlistMutation.mutateAsync(selectedSeatForCancel.id);
      handleCloseCancelModal();
    } catch (err) {
      console.error(err);
      showToast('취소 처리 중 오류가 발생했습니다.');
    }
  };


  // 모든 좌석을 flat하게 펼쳐서 공연 정보를 붙이고, 대기 순번으로 정렬
  const flatSeats = React.useMemo(() => {
    if (!waitlist) return [];
    const seats: FlatWaitlistSeat[] = [];
    waitlist.forEach((item) => {
      item.seats?.forEach((seat) => {
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

  const renderSeatCard = (seat: FlatWaitlistSeat) => {
    return (
      <WaitlistSeatCard
        key={seat.id}
        seat={seat}
        onSelectOffer={setSelectedOfferId}
        onCancel={handleOpenCancelModal}
        onPassOffer={handleOpenPassModal}
      />
    );
  };

  // 섹션 헤더 렌더링 헬퍼
  const renderSectionHeader = (emoji: string, title: string, count: number, color: string) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="text-lg">{emoji}</span>
      <span className={`text-sm font-extrabold ${color}`}>{title}</span>
      <span className="text-xs font-bold text-content-muted bg-surface-muted px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );

  return (
    <div className="w-full animate-fade-in relative">
      {flatSeats.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <Text typography="t5" color="secondary">
            총 <span className="font-bold text-primary">{flatSeats.length}</span>건의 좌석 대기 중
          </Text>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-full h-20 bg-surface-muted animate-pulse rounded-2xl" />
          ))
        ) : flatSeats.length > 0 ? (
          <>
            <div className="flex flex-col gap-2.5">
              {flatSeats.map((seat) => renderSeatCard(seat))}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-16 md:py-24 px-6 bg-surface-subtle rounded-2xl border border-line text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-muted mb-5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <Text typography="t5" fontWeight="bold" color="secondary" textAlign="center" className="mb-2 break-keep">
              취소표 대기 내역이 없습니다.
            </Text>
            <Text typography="t6" color="tertiary" textAlign="center" className="break-keep max-w-none">
              원하시는 공연의 취소표 대기를 걸어보세요!
            </Text>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleExecuteCancel}
        title="대기 취소"
        description="이 좌석의 대기를 취소하시겠습니까?"
        confirmText="취소하기"
        cancelText="닫기"
        isConfirmDisabled={false}
      >
        {selectedSeatForCancel && (
          <div className="flex items-center gap-3 p-3 mt-2 rounded-lg bg-surface-subtle border border-line-subtle text-left">
            <span className={`shrink-0 px-2.5 py-1 text-[11px] font-extrabold rounded-md border ${selectedSeatForCancel.waitlistNumber <= 0 ? 'bg-highlight-light text-highlight border-danger-light' : 'bg-accent-light text-accent border-accent-light'}`}>
              {selectedSeatForCancel.waitlistNumber <= 0 ? '배정 완료' : `대기 ${selectedSeatForCancel.waitlistNumber}번`}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-content truncate">{selectedSeatForCancel.info}</span>
              <span className="text-[11px] text-content-muted truncate">{selectedSeatForCancel.eventTitle}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* 배정 완료 좌석 취소(패스) 확인 모달 */}
      <Modal
        isOpen={isPassModalOpen}
        onClose={() => { setIsPassModalOpen(false); setSelectedPassOfferId(null); setSelectedPassSeat(null); }}
        onCancel={() => { setIsPassModalOpen(false); setSelectedPassOfferId(null); setSelectedPassSeat(null); }}
        onConfirm={handleExecutePass}
        title="배정 취소"
        description="배정된 좌석을 포기하시겠습니까? 취소 시 다음 대기자에게 기회가 넘어갑니다."
        confirmText="취소하기"
        cancelText="닫기"
        isConfirmDisabled={false}
      >
        {selectedPassSeat && (
          <div className="flex items-center gap-3 p-3 mt-2 rounded-lg bg-surface-subtle border border-line-subtle text-left">
            <span className="shrink-0 px-2.5 py-1 text-[11px] font-extrabold rounded-md border bg-highlight-light text-highlight border-danger-light">
              배정 완료
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-bold text-content truncate">{selectedPassSeat.info}</span>
              <span className="text-[11px] text-content-muted truncate">{selectedPassSeat.eventTitle}</span>
            </div>
          </div>
        )}
      </Modal>

      {selectedOfferId && (
        <CancellationDetailView
          cancellationId={selectedOfferId}
          onClose={() => {
            setSelectedOfferId(null);
            // 결제 완료 후 돌아왔을 때 최신 대기 목록을 다시 불러오도록 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: ['waitlistBookings'] });
          }}
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
