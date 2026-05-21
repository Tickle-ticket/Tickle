import React from 'react';
import dynamic from 'next/dynamic';
import { Modal } from '@/src/shared/components/Modal';
import congratulationsAnimation from '@/src/shared/lottle/congratulations.json';

const Lottie = dynamic(() => import('lottie-react').then((mod) => mod.default || mod), { ssr: false });

export interface MockResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  win: boolean;
  winNumber: number;
}

export const MockResultModal = ({
  isOpen,
  onClose,
  win,
  winNumber,
}: MockResultModalProps) => {
  const title = win ? '축하합니다!' : '아쉬워요ㅠㅠ';
  const description = win
    ? `커피 쿠폰 ${winNumber}개에 당첨됐습니다.\n해당 화면을 꼭 캡쳐해서 서울 2반 양희령(@gaau511)에게 MM 보내주세요!`
    : '커피 쿠폰에 당첨되지 못했어요.\n참여해주셔서 감사합니다!';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        description={description}
        confirmText="확인"
        showCancelButton={false}
        onConfirm={onClose}
      />
      {isOpen && win && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
          <Lottie
            animationData={congratulationsAnimation}
            loop={false}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
    </>
  );
};
