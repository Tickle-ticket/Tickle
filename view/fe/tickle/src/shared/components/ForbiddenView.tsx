'use client';

import { ApiError } from '@/src/shared/api/types';
import { isFailure } from '@/src/shared/api/errors';

/**
 * 403 Forbidden 안내 화면.
 *
 * 서버는 403을 여러 사유로 내려주며(services/be GlobalErrorCode·BlacklistErrorCode 등),
 * 에러코드 이름 없이 `{ status, message }`만 전달한다. 따라서 사용자에게 보여줄
 * 문구는 서버 message를 그대로 사용하고, 알 수 없는 형태일 때만 기본 문구로 대체한다.
 */
const FALLBACK_MESSAGE = '이 항목에 접근할 권한이 없습니다.';

export const getForbiddenMessage = (error: unknown): string => {
  if (error instanceof ApiError && typeof error.message === 'string') {
    const trimmed = error.message.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return FALLBACK_MESSAGE;
};

/**
 * 권한 부족으로 막힌 것인지 판별한다.
 *
 * 같은 403이라도 블랙리스트 차단은 이 화면이 아니라 /blocked로 보내야 하므로
 * (client가 이미 그렇게 한다) 태그로 구분한다. status만 보면 둘이 섞인다.
 */
export const isForbiddenError = (error: unknown): boolean =>
  isFailure(error, 'ForbiddenError');

interface ForbiddenViewProps {
  /** 서버에서 받은 에러. message를 그대로 문구로 사용한다. */
  error?: unknown;
  /** 돌아가기 동작. 없으면 버튼을 표시하지 않는다. */
  onBack?: () => void;
  backLabel?: string;
  /** 모달 등 좁은 영역에서 사용할 때 전체 높이를 쓰지 않는다. */
  compact?: boolean;
}

export const ForbiddenView = ({
  error,
  onBack,
  backLabel = '돌아가기',
  compact = false,
}: ForbiddenViewProps) => {
  const message = getForbiddenMessage(error);

  return (
    <div
      className={`w-full flex flex-col items-center justify-center gap-4 ${
        compact ? 'py-10' : 'min-h-screen bg-surface-subtle'
      }`}
    >
      <span className="text-4xl font-bold text-content-muted">403</span>
      <p className="text-content-secondary font-bold text-center px-6">{message}</p>
      {onBack && (
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-surface-active hover:bg-surface-active rounded-xl font-bold text-content transition-colors"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
};

export default ForbiddenView;
