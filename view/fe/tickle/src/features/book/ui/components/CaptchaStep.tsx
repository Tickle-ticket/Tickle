'use client';

import React from 'react';
import { CustomCAPTCHA } from '@/src/shared/components/CustomCAPTCHA';
import { BookingModals } from './BookingModals';

interface CaptchaStepProps {
  onSuccess: (token: string) => void;
  onClose: () => void;
  isExitModalOpen: boolean;
  errorModalConfig: { isOpen: boolean; title: string; message: string; onConfirm?: () => void; confirmText?: string; showCancelButton?: boolean };
  handleCancelExit: () => void;
  handleConfirmExit: () => void;
  handleCloseErrorModal: () => void;
}

export const CaptchaStep: React.FC<CaptchaStepProps> = ({
  onSuccess,
  onClose,
  isExitModalOpen,
  errorModalConfig,
  handleCancelExit,
  handleConfirmExit,
  handleCloseErrorModal,
}) => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-surface-subtle p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="z-10 animate-fade-in">
        <CustomCAPTCHA
          onSuccess={onSuccess}
          onClose={onClose}
        />
      </div>

      <BookingModals
        isExitModalOpen={isExitModalOpen}
        isWaitlistCompleteModalOpen={false}
        isConflictModalOpen={false}
        errorModalConfig={errorModalConfig}
        handleCancelExit={handleCancelExit}
        handleConfirmExit={handleConfirmExit}
        handleCloseWaitlistComplete={() => { }}
        handleCloseConflictModal={() => { }}
        handleCloseErrorModal={handleCloseErrorModal}
      />
    </div>
  );
};
