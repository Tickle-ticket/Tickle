'use client';

import { ErrorView } from './ErrorView';
import type { ErrorType } from './types';
import { ApiError } from '@/src/shared/api/types';

/**
 * API 에러(status + message)를 화면으로 변환하는 어댑터.
 *
 * 사유별 분기를 두는 대신 **서버 message를 그대로 표시**한다. 새로운 에러 사유가
 * 추가돼도 프론트 수정 없이 올바른 문구가 노출된다. 사유에 따라 동작을 바꿔야 하는
 * 화면은 이 컴포넌트에 오기 전에 `failure`를 catchTag로 가져간다.
 *
 * 5xx에는 서버가 traceId를 싣는다. 미정의 예외는 message가 "서버 내부 오류가
 * 발생했습니다."로 뭉뚱그려져 문의를 받아도 어떤 요청이었는지 특정할 수 없는데,
 * 이 값을 함께 보여주면 Tempo에서 그 요청을 바로 찾을 수 있다.
 */

/** status를 ErrorView가 아는 타입으로 좁힌다. */
const toErrorType = (status: number | undefined): ErrorType => {
  if (status === undefined) return '500';
  if (status === 401) return '401';
  if (status === 403) return '403';
  if (status === 404) return '404';
  if (status >= 500) return '500';
  // 400·409 등 나머지 4xx는 서버 message가 사유를 담고 있어 500 레이아웃을 재사용한다.
  return '500';
};

export const getApiErrorStatus = (error: unknown): number | undefined =>
  error instanceof ApiError ? error.status : undefined;

export const getApiErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof ApiError && typeof error.message === 'string') {
    const trimmed = error.message.trim();
    if (trimmed) return trimmed;
  }

  return undefined;
};

/** 서버가 5xx에 실은 추적 식별자. 사용자가 문의할 때 전달할 값이다. */
export const getApiErrorTraceId = (error: unknown): string | undefined =>
  error instanceof ApiError ? error.traceId : undefined;

interface ApiErrorViewProps {
  /** apiClient가 던진 ApiError. status·message를 화면에 반영한다. */
  error: unknown;
  /** 액션 버튼 동작. 없으면 ErrorView 기본값(홈 이동 등)을 따른다. */
  onAction?: () => void;
  actionText?: string;
  /** 모달 등 좁은 영역에서 여백을 줄인다. */
  compact?: boolean;
  className?: string;
}

export const ApiErrorView = ({
  error,
  onAction,
  actionText,
  compact = false,
  className,
}: ApiErrorViewProps) => {
  const status = getApiErrorStatus(error);
  const type = toErrorType(status);
  const serverMessage = getApiErrorMessage(error);
  const traceId = getApiErrorTraceId(error);

  // ErrorView는 description을 문자열로만 받는다. 별도 슬롯을 만드는 대신
  // 문구 뒤에 붙여, 사용자가 문의할 때 그대로 복사해 전달할 수 있게 한다.
  const description =
    serverMessage && traceId
      ? `${serverMessage} (오류번호: ${traceId})`
      : (serverMessage ?? (traceId ? `오류번호: ${traceId}` : undefined));

  return (
    <ErrorView
      type={type}
      // 상태 코드를 함께 노출해 사용자가 문의 시 상황을 전달할 수 있게 한다.
      title={status ? `${status} — ${TITLE_BY_TYPE[type]}` : undefined}
      // 서버 문구 우선. 없으면 ErrorView의 타입별 기본 설명이 쓰인다.
      description={description}
      actionText={actionText}
      onAction={onAction}
      compact={compact}
      className={className}
    />
  );
};

const TITLE_BY_TYPE: Record<ErrorType, string> = {
  '404': '페이지를 찾을 수 없어요',
  '500': '일시적인 오류입니다',
  '403': '접근 권한이 없습니다',
  '401': '로그인이 필요합니다',
  timeout: '시간이 초과되었습니다',
  soldout: '이미 매진되었습니다',
};

export default ApiErrorView;
