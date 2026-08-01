'use client';

import { Modal } from '@/src/shared/components/Modal';
import { ReCaptcha } from '@/src/shared/components/ReCaptcha';

/**
 * 봇으로 의심될 때 뜨는 CAPTCHA 오버레이와, 검증에 실패했을 때의 안내 모달입니다.
 *
 * <p>둘은 같은 흐름의 앞뒤라 한 곳에 둡니다. 서버(SSE)가 재검증을 요구하면
 * 오버레이가 뜨고, 최종적으로 거부되면 모달로 알린 뒤 예매를 닫습니다.</p>
 *
 * @param isOpen     CAPTCHA 오버레이를 띄울지
 * @param isDenied   최종 거부 안내를 띄울지
 * @param onSuccess  인증 성공
 * @param onFailure  인증 실패·만료
 * @param onDenyClose 거부 안내를 닫을 때(예매 흐름도 함께 닫는다)
 */
export const CaptchaGate = ({
  isOpen,
  isDenied,
  onSuccess,
  onFailure,
  onDenyClose,
}: {
  isOpen: boolean;
  isDenied: boolean;
  onSuccess: (token: string) => void;
  onFailure: () => void;
  onDenyClose: () => void;
}) => (
  <>
    {isOpen && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-[440px] mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <ReCaptcha
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
            theme="light"
            title="보안 검증이 필요합니다"
            description="봇이 아닌지 확인하기 위해 아래 인증을 완료해 주세요."
            buttonText="인증 완료"
            showButton={true}
            onSuccess={onSuccess}
            onError={onFailure}
            onExpire={onFailure}
            onConfirm={onSuccess}
          />
        </div>
      </div>
    )}

    <Modal
      isOpen={isDenied}
      onClose={onDenyClose}
      onConfirm={onDenyClose}
      title="보안 검증 실패"
      description="CAPTCHA 인증에 실패하여 예매를 진행할 수 없습니다. 다시 시도해 주세요."
      confirmText="확인"
      showCancelButton={false}
    />
  </>
);
