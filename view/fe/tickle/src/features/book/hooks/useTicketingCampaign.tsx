import React, { useState } from 'react';
import { isMockBookingCompleteEvent, isMockLoginEvent } from '@/src/shared/config/mockEventConfig';
import { MockResultModal } from '../ui/components/MockResultModal';

/**
 * 티켓팅 체험 행사 진행을 담당하는 훅입니다.
 *
 * 이름에 mock이 들어가지만 **실제로 동작하는 기능**이다. 환경변수로 지정한 체험용
 * 공연(NEXT_PUBLIC_MOCK_*_EVENT_ID)에서 예매를 완료하면 일반 예매 대신 참여를
 * 집계하고 당첨 결과를 보여준다.
 *
 * 대상 공연이 아니면 어떤 단계도 가로채지 않으므로 실제 예매 흐름에 영향이 없다.
 */

/** 권종 선택 결과. 좌석별로 고른 할인 항목을 담는다. */
export type OptionSelection = { sessionSeatId: number; discountName: string };

interface UseTicketingCampaignParams {
  eventId: string;
  /** 체험 참여를 서버에 기록하고 당첨 여부를 돌려주는 함수. */
  submitCampaignEntry: (
    eventId: number,
    scheduleId: number,
    seatIds: number[],
    optionSelections: OptionSelection[],
  ) => Promise<{ win: boolean; winCount: number }>;
  isHoldingSeatRef: React.MutableRefObject<boolean>;
  onClose: () => void;
  onLeaveQueue?: () => void;
}

export const useTicketingCampaign = ({
  eventId,
  submitCampaignEntry,
  isHoldingSeatRef,
  onClose,
  onLeaveQueue,
}: UseTicketingCampaignParams) => {
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [winNumber, setWinNumber] = useState(0);

  const isCampaignEvent = isMockBookingCompleteEvent(eventId) || isMockLoginEvent(eventId);

  /**
   * 예매 초안 생성을 가로채 체험 참여로 처리합니다.
   *
   * @returns 가로챘으면 true
   */
  const interceptPreorder = async (
    scheduleId: string,
    seatIds: number[],
    optionSelections: OptionSelection[],
  ): Promise<boolean> => {
    if (!isCampaignEvent) {
      return false;
    }

    const result = await submitCampaignEntry(
      parseInt(eventId, 10),
      parseInt(scheduleId, 10),
      seatIds,
      optionSelections,
    );

    isHoldingSeatRef.current = false;
    onLeaveQueue?.();

    setHasWon(result.win);
    setWinNumber(result.winCount);
    setIsResultModalOpen(true);

    return true;
  };

  /** 체험 공연에서는 버튼 문구를 '참여 완료'로 바꾼다. */
  const submitButtonText = isCampaignEvent ? '참여 완료' : undefined;

  const ResultModal = (
    <MockResultModal
      isOpen={isResultModalOpen}
      onClose={() => {
        setIsResultModalOpen(false);
        onClose();
      }}
      win={hasWon}
      winNumber={winNumber}
    />
  );

  return { isCampaignEvent, interceptPreorder, submitButtonText, ResultModal };
};
