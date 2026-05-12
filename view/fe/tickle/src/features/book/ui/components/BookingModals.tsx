import React from 'react';
import { Modal } from '@/src/shared/components/Modal';

interface BookingModalsProps {
  isExitModalOpen: boolean;
  isWaitlistCompleteModalOpen: boolean;
  isConflictModalOpen: boolean;
  errorModalConfig: { isOpen: boolean; title: string; message: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean };
  handleCancelExit: () => void;
  handleConfirmExit: () => void;
  handleCloseWaitlistComplete: () => void;
  handleCloseConflictModal: () => void;
  handleCloseErrorModal: () => void;
}

export const BookingModals: React.FC<BookingModalsProps> = ({
  isExitModalOpen,
  isWaitlistCompleteModalOpen,
  isConflictModalOpen,
  errorModalConfig,
  handleCancelExit,
  handleConfirmExit,
  handleCloseWaitlistComplete,
  handleCloseConflictModal,
  handleCloseErrorModal,
}) => {
  return (
    <>
      <Modal
        isOpen={isExitModalOpen}
        onClose={handleCancelExit}
        title="대기열 퇴장"
        description="대기열에서 퇴장하시겠습니까? 다시 진입 시 대기 순서가 초기화됩니다."
        confirmText="퇴장하기"
        cancelText="계속 대기"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />

      <Modal
        isOpen={isWaitlistCompleteModalOpen}
        onClose={() => {}}
        title="취소표 대기 신청 완료"
        description="해당 좌석에 대한 취소표 대기 신청이 성공적으로 완료되었습니다. 취소표 발생 시 알림을 보내드립니다."
        confirmText="확인"
        onConfirm={handleCloseWaitlistComplete}
        showCancelButton={false}
      />

      {/* 이미 선점된 좌석 알림 모달 */}
      {isConflictModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-[400px] shadow-2xl overflow-hidden animate-slide-up relative flex flex-col">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3">이미 선점된 좌석입니다</h2>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-8">
                선택하신 좌석 중 누군가 먼저 결제를 진행 중인 좌석이 포함되어 있습니다. 좌석을 다시 선택해 주세요.
              </p>
              <button
                onClick={handleCloseConflictModal}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-[16px] py-4 rounded-xl transition-colors shadow-md shadow-red-600/20 active:scale-95"
              >
                다시 선택하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API 에러 공통 모달 */}
      <Modal
        isOpen={errorModalConfig.isOpen}
        onClose={handleCloseErrorModal}
        title={errorModalConfig.title}
        description={errorModalConfig.message}
        confirmText={errorModalConfig.confirmText || '확인'}
        onConfirm={handleCloseErrorModal}
        showCancelButton={errorModalConfig.showCancelButton ?? false}
      />
    </>
  );
};
