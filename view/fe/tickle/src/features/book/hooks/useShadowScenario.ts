/**
 * shadow 공연(eventId 404·405)에서 예매 단계를 가로채는 훅입니다.
 *
 * shadow는 봇 탐지 학습 데이터를 모으기 위한 가상 공연이라 서버에 좌석·예매
 * 레코드가 없다. 따라서 선점·대기신청 API를 호출하는 대신 곧바로 결과 화면을
 * 보여준다. 각 함수는 **가로챘으면 true**를 돌려주고, 호출부는 true일 때 실제
 * 예매 흐름을 중단한다.
 */

interface UseShadowScenarioParams {
  /** shadow 공연 여부. 거짓이면 어떤 단계도 가로채지 않는다. */
  isShadow: boolean;
  seatsData: Record<string, { status?: string } | undefined>;
  selectedSeats: Set<string>;
  setErrorModalConfig: (config: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    showCancelButton?: boolean;
  }) => void;
  setIsWaitlistCompleteModalOpen: (value: boolean) => void;
  setIsConflictModalOpen: (value: boolean) => void;
  setIsHolding: (value: boolean) => void;
  onClose: () => void;
}

export const useShadowScenario = ({
  isShadow,
  seatsData,
  selectedSeats,
  setErrorModalConfig,
  setIsWaitlistCompleteModalOpen,
  setIsConflictModalOpen,
  setIsHolding,
  onClose,
}: UseShadowScenarioParams) => {
  /**
   * 대기 신청 단계를 가로챕니다.
   *
   * @returns 가로챘으면 true
   */
  const interceptWaitlistSubmit = async (): Promise<boolean> => {
    if (!isShadow) {
      return false;
    }

    setIsWaitlistCompleteModalOpen(true);
    return true;
  };

  /**
   * 좌석 선점 단계를 가로챕니다.
   *
   * 이미 매진된 좌석이 섞여 있으면 실제 선점 경합처럼 충돌 모달을 띄우고,
   * 그렇지 않으면 체험 완료 안내를 보여준다.
   *
   * @returns 가로챘으면 true
   */
  const interceptSeatHold = async (): Promise<boolean> => {
    if (!isShadow) {
      return false;
    }

    const hasUnavailableSeat = Array.from(selectedSeats).some(
      (seatId) => seatsData[seatId]?.status === 'disabled',
    );

    if (hasUnavailableSeat) {
      setIsConflictModalOpen(true);
      setIsHolding(false);
      return true;
    }

    setErrorModalConfig({
      isOpen: true,
      title: '축하합니다!',
      message: '커피 쿠폰을 획득하셨습니다.\n실전에서도 좋은 결과가 있길 바랄게요!',
      confirmText: '확인',
      onConfirm: () => {
        onClose();
      },
    });
    setIsHolding(false);
    return true;
  };

  return { interceptWaitlistSubmit, interceptSeatHold };
};
