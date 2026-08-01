'use client';

import React, { useEffect, useState } from 'react';
import { useCancellationDetail } from '../api/useCancellationDetail';
import { PaymentStep } from '@/src/features/book/ui/components/PaymentStep';
import { useUserProfile } from '@/src/shared/api/useUserProfile';
import { Modal } from '@/src/shared/components/Modal';
import { useToast } from '@/src/shared/providers/ToastProvider';
import { useBookStore } from '@/src/features/book/store/useBookStore';

interface CancellationDetailViewProps {
  cancellationId: string;
  onClose: () => void;
}

export const CancellationDetailView: React.FC<CancellationDetailViewProps> = ({ cancellationId, onClose }) => {
  const { data, isLoading, error } = useCancellationDetail(cancellationId);
  const { data: userProfile } = useUserProfile();
  const { showToast } = useToast();
  const setBookingStep = useBookStore((s) => s.setBookingStep);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [errorModalConfig, setErrorModalConfig] = useState<{isOpen: boolean; title: string; message: string}>({
    isOpen: false, title: '', message: ''
  });

  useEffect(() => {
    if (error) {
      // 여기서 바로 닫으므로 이 화면에는 메시지를 띄울 자리가 없다. 토스트는
      // 닫힌 뒤에도 남아 사용자가 사유를 읽을 수 있다(alert처럼 흐름을 막지도 않는다).
      showToast(`조회 실패: ${error.message}`);
      onClose();
    }
  }, [error, onClose, showToast]);

  // 결제 오버레이가 열렸을 때 브라우저 뒤로가기 버튼을 가로채서 확인 모달을 표시
  useEffect(() => {
    if (!showPaymentFlow) return;

    // 더미 히스토리 항목을 push해서 뒤로가기 시 popstate 이벤트가 발생하게 함
    window.history.pushState({ cancelPaymentGuard: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      // 뒤로가기 눌림 → 모달을 띄우고, 다시 히스토리를 push해서 추가 뒤로가기도 방어
      e.preventDefault();
      window.history.pushState({ cancelPaymentGuard: true }, '');
      setShowBackConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showPaymentFlow]);

  // 결제 오버레이에서 뒤로가기를 눌렀을 때 확인 모달을 띄운다
  const handlePaymentBack = () => {
    setShowBackConfirm(true);
  };

  // 확인 → 마이페이지로 복귀
  const handleConfirmBack = () => {
    setShowBackConfirm(false);
    setShowPaymentFlow(false);
    // popstate 가드용 더미 히스토리 정리 (뒤로가기 한 칸)
    window.history.back();
    onClose();
  };

  // 취소 → 결제 화면 유지
  const handleCancelBack = () => {
    setShowBackConfirm(false);
  };

  return (
    <>
      {showPaymentFlow && data ? (
        <div className="fixed inset-0 z-[100] bg-surface overflow-y-auto">
          <PaymentStep
            eventId="cancel"
            userId={userProfile?.userId}
            userProfile={userProfile}
            onCancel={handlePaymentBack}
            onConflictError={() => setErrorModalConfig({ isOpen: true, title: '결제 오류', message: '결제 오류가 발생했습니다.' })}
            onError={(title, msg) => setErrorModalConfig({ isOpen: true, title, message: msg })}
            cancellationId={Number(cancellationId)}
            cancellationTotalAmount={data.totalPaymentAmount}
          />
        </div>
      ) : (
        <Modal
          isOpen={!isLoading && !!data}
          onClose={onClose}
          title="취소표 결제 확인"
          confirmText="결제 진행"
          cancelText="취소"
          onConfirm={() => {
            setBookingStep('PAYMENT');
            setShowPaymentFlow(true);
          }}
          onCancel={onClose}
        >
          {data && (
            <div className="w-full mt-2">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-line-subtle">
                    <td className="py-2.5 pr-3 text-content-muted font-medium whitespace-nowrap text-left">좌석</td>
                    <td className="py-2.5 text-content font-bold text-right">{data.section} {data.row}열 {data.number}번</td>
                  </tr>
                  <tr className="border-b border-line-subtle">
                    <td className="py-2.5 pr-3 text-content-muted font-medium whitespace-nowrap text-left">결제 금액</td>
                    <td className="py-2.5 text-primary font-extrabold text-right text-base">{data.totalPaymentAmount?.toLocaleString()}원</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 text-content-muted font-medium whitespace-nowrap text-left">만료 일시</td>
                    <td className="py-2.5 text-highlight font-semibold text-right text-xs">{new Date(data.offerExpiresAt).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-center text-content-tertiary text-xs mt-3">결제를 진행하시겠습니까?</p>
            </div>
          )}
        </Modal>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="text-white bg-content px-6 py-4 rounded-xl border border-line-strong shadow-2xl">
            <p className="animate-pulse font-medium">취소표 정보를 불러오는 중...</p>
          </div>
        </div>
      )}

      <Modal
        isOpen={errorModalConfig.isOpen}
        onClose={() => setErrorModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={errorModalConfig.title}
        confirmText="확인"
        onConfirm={() => setErrorModalConfig(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="py-4 text-center text-content-secondary font-medium whitespace-pre-line leading-relaxed">
          {errorModalConfig.message}
        </div>
      </Modal>

      {/* 결제 화면에서 뒤로가기 시 확인 모달 */}
      <Modal
        isOpen={showBackConfirm}
        onClose={handleCancelBack}
        onCancel={handleCancelBack}
        onConfirm={handleConfirmBack}
        title="돌아가시겠습니까?"
        confirmText="돌아가기"
        cancelText="계속 결제"
      >
        <div className="py-3 text-center">
          <p className="text-content-secondary font-medium leading-relaxed break-keep">
            지금 돌아가도 취소표 대기가 취소되지는 않습니다.
          </p>
          <p className="text-highlight font-bold text-sm mt-2 leading-relaxed break-keep">
            단, 제한 시간 안에 결제를 완료하지 않으면
            <br />취소표 기회가 만료됩니다.
          </p>
        </div>
      </Modal>
    </>
  );
};
