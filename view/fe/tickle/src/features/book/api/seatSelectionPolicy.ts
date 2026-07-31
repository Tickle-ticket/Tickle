import { isShadowMode } from '@/src/shared/utils/shadowMode';

/**
 * 좌석 선택 단계의 규칙을 한 곳에 모은 정책입니다.
 *
 * shadow 모드(eventId 404·405)는 봇 탐지 학습 데이터를 모으기 위한 가상 공연이라
 * 실제 예매 제약을 그대로 적용하면 시나리오를 끝까지 진행할 수 없다. 좌석 보유
 * 한도·대기 전환·선택 가능 판정이 달라지는데, 그 예외를 좌석 훅 곳곳에 흩어두면
 * 실제 규칙을 읽을 때마다 shadow 여부를 함께 따져야 한다.
 *
 * 그래서 "무엇이 다른가"를 이 파일에만 두고, useSeatStep은 정책이 내준 값만 쓴다.
 */

/** 사용자 한 명이 한 회차에서 보유할 수 있는 좌석 수. */
const MAX_SEATS_PER_SESSION = 4;

/** shadow 모드에서 쓰는 사실상 무제한 한도. */
const UNLIMITED_SEATS = 99;

export interface SeatSelectionPolicy {
  /** 가상 공연 여부. 예매 API를 타지 않는 시나리오임을 뜻한다. */
  readonly isShadow: boolean;
  /** 대기 신청 화면으로 동작하는지 여부. */
  readonly isWaitlistMode: boolean;
  /** 좌석 취소(예매 변경) 화면으로 동작하는지 여부. */
  readonly isCancelMode: boolean;
  /** 보유 좌석 수를 서버에 조회할 필요가 있는지 여부. */
  readonly needsOwnershipCount: boolean;

  /** 현재 선택 가능한 최대 좌석 수를 계산한다. */
  maxSelectable(ownedCount: number): number;
  /** 좌석 하나를 선택할 수 있는지 판정한다. */
  isSelectable(seat: { isAvailable: boolean; waitable?: boolean }, isMyInitialSeat: boolean): boolean;
  /** 매진 좌석을 회색(disabled)으로 표시할지 판정한다. */
  showsDisabledColor(isSelectable: boolean): boolean;
  /** 선택 한도를 넘겼을 때 사용자에게 경고를 띄울지 판정한다. */
  warnsOnLimitExceeded(): boolean;
}

/**
 * 예매 모드와 공연 종류로부터 좌석 선택 정책을 만듭니다.
 *
 * @param mode    화면이 요청한 모드
 * @param eventId 공연 식별자 (shadow 판별에 쓴다)
 */
export const createSeatSelectionPolicy = (
  mode: 'BOOK' | 'CANCEL' | 'WAITLIST',
  eventId: string | number | null | undefined,
): SeatSelectionPolicy => {
  const isShadow = isShadowMode(eventId ? String(eventId) : null);

  // shadow는 대기 신청 시나리오를 재현하므로 항상 대기 모드로 동작한다.
  const isWaitlistMode = mode === 'WAITLIST' || isShadow;
  const isCancelMode = mode === 'CANCEL';

  return {
    isShadow,
    isWaitlistMode,
    isCancelMode,
    // 가상 공연에는 서버에 예매 이력이 없다.
    needsOwnershipCount: !isShadow,

    maxSelectable(ownedCount) {
      if (isShadow) {
        return UNLIMITED_SEATS;
      }
      return Math.max(0, MAX_SEATS_PER_SESSION - ownedCount);
    },

    isSelectable(seat, isMyInitialSeat) {
      // shadow는 잔여 좌석만 고르게 해 대기 신청 흐름을 단순화한다.
      if (isShadow) {
        return seat.isAvailable;
      }
      if (isWaitlistMode) {
        return !!seat.waitable;
      }
      return seat.isAvailable || isMyInitialSeat;
    },

    showsDisabledColor(isSelectable) {
      // 실제 대기 모드에서만 신청 불가 좌석을 회색으로 죽인다.
      return !isSelectable && isWaitlistMode && !isShadow;
    },

    warnsOnLimitExceeded() {
      // shadow는 한도가 사실상 무제한이라 경고할 상황 자체가 의미 없다.
      return !isShadow;
    },
  };
};
