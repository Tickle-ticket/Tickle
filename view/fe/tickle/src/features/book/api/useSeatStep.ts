'use client';

import React, { useMemo, useCallback } from 'react';
import { useSeatDataWithFixtures } from '@/src/features/book/api/useSeatDataWithFixtures';
import { seatApi } from '@/src/shared/api/seatApi';
import { createCancellationWaitCandidates } from '@/src/shared/api/cancellationApi';
import { useQuery } from '@tanstack/react-query';
import { reservationApi } from '@/src/shared/api/reservationApi';
import type { EventDetailResponse } from '@/src/features/book/api/useEventDetail';
import type { UserProfileData } from '@/src/shared/api/useUserProfile';
import { REALTIME } from '@/src/shared/api/cachePolicy';
import { createSeatSelectionPolicy } from './seatSelectionPolicy';
import { navigateToBlocked } from '@/src/shared/utils/blockedNavigation';
import { useBookStore } from '../store/useBookStore';
import type { SeatColor, SeatStatus, CongestionLevel } from '@/src/shared/components/types';

interface UseSeatStepOptions {
  eventDetail: EventDetailResponse | undefined;
  userProfile: UserProfileData | null | undefined;
  mode: 'BOOK' | 'CANCEL' | 'WAITLIST';
  admitToken: string | null;
  initialSeats: string[];
  scheduleId: string | null;
}

/**
 * 좌석 선택 단계에 필요한 모든 데이터와 핸들러를 제공하는 커스텀 훅.
 * BookView에서 좌석 관련 로직을 분리하여 관리.
 */
export function useSeatStep({
  eventDetail,
  userProfile,
  mode,
  admitToken,
  initialSeats,
  scheduleId,
}: UseSeatStepOptions) {
  const policy = createSeatSelectionPolicy(mode, eventDetail?.eventId);
  const { isShadow: isShadowModeActive, isWaitlistMode, isCancelMode } = policy;

  const selectedSeats = useBookStore(s => s.selectedSeats);
  const toggleSeat = useBookStore(s => s.toggleSeat);
  const selectedSeatsToCancel = useBookStore(s => s.selectedSeatsToCancel);
  const toggleCancelSeat = useBookStore(s => s.toggleCancelSeat);
  const isModifyModeActive = useBookStore(s => s.isModifyModeActive);
  const bookingStep = useBookStore(s => s.bookingStep);

  const enableWs = !isCancelMode || isModifyModeActive;

  const { data: seatAvailability, venueId, isLoading: isSeatsLoading, error: seatError } = useSeatDataWithFixtures(
    eventDetail?.eventId || null,
    scheduleId,
    enableWs,
    mode === 'WAITLIST' ? 'WAITLIST' : 'BOOKING',
    admitToken
  );

  const { data: ownershipCountResponse } = useQuery({
    queryKey: ['ownershipCount', eventDetail?.eventId, scheduleId, userProfile?.userId],
    queryFn: async () => {
      if (!eventDetail?.eventId || !scheduleId || !userProfile?.userId) return null;
      const res = await reservationApi.getOwnershipCount(eventDetail.eventId, scheduleId, userProfile.userId);
      return res.data;
    },
    enabled:
      policy.needsOwnershipCount &&
      !!eventDetail?.eventId && !!scheduleId && !!userProfile?.userId,
    // 1인당 예매 가능 수량은 다른 기기·탭에서의 예매로도 줄어든다. 좌석을
    // 고르는 시점의 값이 아니면 선점 단계에서 서버 거절로 이어진다.
    staleTime: REALTIME,
    gcTime: 0,
  });

  const maxSelectable = policy.maxSelectable(ownershipCountResponse?.totalCount || 0);

  // 좌석 데이터 가공
  const seatsData = useMemo(() => {
    const result: Record<string, { color?: SeatColor; status: SeatStatus; isSelected: boolean; congestion?: CongestionLevel; sessionSeatId?: number; detailedInfo?: string }> = {};

    if (isCancelMode && !isModifyModeActive) {
      initialSeats.forEach(seatId => {
        const isSelected = selectedSeatsToCancel.has(seatId);
        result[seatId] = { status: 'selectable', isSelected, color: 'vip' as SeatColor };
      });
    } else if (seatAvailability) {
      Object.entries(seatAvailability).forEach(([seatId, info]) => {
        const isMyInitialSeat = initialSeats.includes(seatId);
        const isSelectable = policy.isSelectable(info, isMyInitialSeat);
        const isSelected = isMyInitialSeat ? selectedSeatsToCancel.has(seatId) : selectedSeats.has(seatId);
        const reachedMax = selectedSeats.size >= maxSelectable;
        const canToggle = !reachedMax || isSelected || isMyInitialSeat;
        const status: SeatStatus = (isSelectable && canToggle) ? 'selectable' : 'disabled';

        let congestion: 'high' | 'medium' | 'low' | 'none' = 'none';
        if (isWaitlistMode && !info.isAvailable) {
          const count = info.waitingCount || 0;
          if (count >= 10) congestion = 'high';
          else if (count >= 5) congestion = 'medium';
          else congestion = 'low';
        }

        if (bookingStep === 'TICKET_TYPE' && !isSelected) {
          result[seatId] = { status: 'disabled' as SeatStatus, isSelected: false, color: 'disabled' as SeatColor, congestion, sessionSeatId: info.sessionSeatId, detailedInfo: info.detailedInfo };
        } else {
          const gradeColor = isMyInitialSeat ? 'vip' : (policy.showsDisabledColor(isSelectable) ? 'disabled' : (info.priceGrade?.toLowerCase() || '일반'));
          result[seatId] = { status, isSelected, color: gradeColor as SeatColor, congestion, sessionSeatId: info.sessionSeatId, detailedInfo: info.detailedInfo };
        }
      });
    }

    return result;
  }, [seatAvailability, isCancelMode, isModifyModeActive, initialSeats, selectedSeatsToCancel, selectedSeats, maxSelectable, isWaitlistMode, isShadowModeActive, bookingStep]);

  const getSeatInfo = useCallback((seatId: string) => {
    if (initialSeats.includes(seatId)) {
      const match = seatId.match(/^[a-zA-Z]+/);
      let priceGrade = match ? match[0].toUpperCase() : 'VIP';
      if (priceGrade === 'V') priceGrade = 'VIP';
      const price = eventDetail?.zonePrices.find((p) => p.priceGrade === priceGrade)?.price || 0;
      return { priceGrade, price, waitingCount: 0 };
    }
    const priceGrade = seatAvailability?.[seatId]?.priceGrade || '일반';
    const price = eventDetail?.zonePrices.find((p) => p.priceGrade === priceGrade)?.price || 0;
    const waitingCount = seatAvailability?.[seatId]?.waitingCount || 0;
    return { priceGrade, price, waitingCount };
  }, [eventDetail, seatAvailability, initialSeats]);

  const getDetailedSeatInfo = useCallback((seatId: string) => {
    return seatsData[seatId]?.detailedInfo || seatId;
  }, [seatsData]);

  const handleSeatClick = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e && !e.isTrusted) {
      navigateToBlocked();
      return;
    }
    const isMyInitialSeat = initialSeats.includes(id);
    if (!selectedSeats.has(id) && !isMyInitialSeat && selectedSeats.size >= maxSelectable) {
      if (policy.warnsOnLimitExceeded()) {
        return { error: true, title: '선택 제한', message: `최대 ${maxSelectable}개까지 선택 가능합니다.` };
      }
      return;
    }
    if (bookingStep === 'TICKET_TYPE') return;

    if ((isCancelMode && !isModifyModeActive) || initialSeats.includes(id)) {
      toggleCancelSeat(id);
      return;
    }

    const seatData = seatsData[id];
    if (!scheduleId || !seatData || seatData.status !== 'selectable' || !seatData.sessionSeatId) return;
    toggleSeat(id);
  }, [initialSeats, selectedSeats, maxSelectable, policy, bookingStep, isCancelMode, isModifyModeActive, toggleCancelSeat, seatsData, scheduleId, toggleSeat]);

  return {
    seatAvailability,
    venueId,
    isSeatsLoading,
    seatError,
    maxSelectable,
    seatsData,
    getSeatInfo,
    getDetailedSeatInfo,
    handleSeatClick,
    isWaitlistMode,
    isCancelMode,
    isShadowModeActive,
  };
}
