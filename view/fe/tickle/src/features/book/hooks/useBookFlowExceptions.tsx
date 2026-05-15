import React, { useState } from 'react';
import { isMockBookingCompleteEvent } from '@/src/shared/config/mockEventConfig';
import { MockResultModal } from '../ui/components/MockResultModal';

interface UseBookFlowExceptionsParams {
  eventId: string;
  storyMode: boolean;
  isShadowModeActive: boolean;
  seatsData: any;
  selectedSeats: Set<string>;
  getSeatInfo: (seatId: string) => any;
  getDetailedSeatInfo: (seatId: string) => string;
  setErrorModalConfig: (config: any) => void;
  setIsWaitlistCompleteModalOpen: (val: boolean) => void;
  setIsConflictModalOpen: (val: boolean) => void;
  setIsHolding: (val: boolean) => void;
  setPreorderBookingId: (id: number) => void;
  setBookingStep: (step: any) => void;
  onClose: () => void;
  onLeaveQueue?: () => void;
  submitMockPreorder: (eventId: number, scheduleId: number, seatIds: number[], optionSelections: any[]) => Promise<any>;
  isHoldingSeatRef: React.MutableRefObject<boolean>;
  onStepChange?: (step: string) => void;
  /** BookView의 실제 TrialCollector finalize 함수를 주입받습니다. */
  finalizeTrial: () => Promise<any>;
}

export const useBookFlowExceptions = ({
  eventId,
  storyMode,
  isShadowModeActive,
  seatsData,
  selectedSeats,
  getSeatInfo,
  getDetailedSeatInfo,
  setErrorModalConfig,
  setIsWaitlistCompleteModalOpen,
  setIsConflictModalOpen,
  setIsHolding,
  setPreorderBookingId,
  setBookingStep,
  onClose,
  onLeaveQueue,
  submitMockPreorder,
  isHoldingSeatRef,
  onStepChange,
  finalizeTrial
}: UseBookFlowExceptionsParams) => {
  const [isTestBookingCompleteModalOpen, setIsTestBookingCompleteModalOpen] = useState(false);
  const [mockWin, setMockWin] = useState(false);
  const [mockWinNumber, setMockWinNumber] = useState(0);

  // 대기열 모드일 때 섀도우/스토리 예외
  const handleWaitlistShadowException = async (): Promise<boolean> => {
    if (storyMode || isShadowModeActive) {
      // finalizeTrial은 handleNextStep 최상단에서 이미 호출됨
      setIsWaitlistCompleteModalOpen(true);
      return true; // handled
    }
    return false;
  };

  // 좌석 선점 시 섀도우 예외 (커피쿠폰 및 충돌)
  const handleSeatShadowException = async (): Promise<boolean> => {
    if (isShadowModeActive) {
      // finalizeTrial은 handleNextStep 최상단에서 이미 호출됨

      const hasUnavailableSeat = Array.from(selectedSeats).some(
        seatId => seatsData[seatId]?.status === 'disabled'
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
        }
      });
      setIsHolding(false);
      return true;
    }
    return false;
  };

  // 좌석 선점 시 스토리모드 Mock 데이터 생성
  const generateStoryModeOptionsData = (scheduleId: string) => {
    if (!storyMode) return null;

    const mockedSeats = Array.from(selectedSeats).map(seatId => {
      const { priceGrade, price } = getSeatInfo(seatId);
      const detailedInfo = getDetailedSeatInfo(seatId);
      const sessionSeatId = seatsData[seatId]?.sessionSeatId || Math.floor(Math.random() * 1000);
      
      return {
        sessionSeatId,
        seatLabel: detailedInfo,
        priceGrade,
        priceInfos: [
          { discountName: '일반', discountRate: 0, ticketPriceAmount: price },
          { discountName: '청소년할인', discountRate: 20, ticketPriceAmount: price * 0.8 },
          { discountName: '국가유공자할인', discountRate: 50, ticketPriceAmount: price * 0.5 },
        ]
      };
    });

    return {
      eventId: eventId,
      sessionId: parseInt(scheduleId, 10),
      currencyCode: 'KRW',
      totalTicketPriceAmount: mockedSeats.reduce((sum, s) => sum + s.priceInfos[0].ticketPriceAmount, 0),
      seats: mockedSeats 
    };
  };

  // 권종 선택 제출(Preorder) 시 예외 처리
  const handleTicketTypeSubmitException = async (
    scheduleId: string, 
    seatIds: number[], 
    optionSelections: any[]
  ): Promise<boolean> => {
    if (isMockBookingCompleteEvent(eventId)) {
      const response = await submitMockPreorder(
        parseInt(eventId, 10),
        parseInt(scheduleId, 10),
        seatIds,
        optionSelections
      );
      isHoldingSeatRef.current = false;
      onLeaveQueue?.();
      
      setMockWin(response.win);
      setMockWinNumber(response.winNumber);
      setIsTestBookingCompleteModalOpen(true);
      
      return true;
    }

    if (storyMode) {
      setPreorderBookingId(9999);
      setBookingStep('PAYMENT');
      onStepChange?.('payment');
      return true;
    }

    return false;
  };

  const submitButtonText = isMockBookingCompleteEvent(eventId) ? '참여 완료' : undefined;

  const ExceptionModalsElement = (
    <MockResultModal
      isOpen={isTestBookingCompleteModalOpen}
      onClose={() => {
        setIsTestBookingCompleteModalOpen(false);
        onClose();
      }}
      win={mockWin}
      winNumber={mockWinNumber}
    />
  );

  return {
    handleWaitlistShadowException,
    handleSeatShadowException,
    generateStoryModeOptionsData,
    handleTicketTypeSubmitException,
    submitButtonText,
    ExceptionModalsElement
  };
};
