import {
  ApiFailure,
  BlacklistedError,
  ClientError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  UnauthorizedError,
  ValidationError,
} from './errors';

/**
 * 실패한 HTTP 응답을 태그드 에러로 옮긴다.
 *
 * 기존 client는 상태 코드와 무관하게 `ApiError` 하나만 던져, 호출부가
 * `err.status === 404` 같은 숫자 비교로 되짚어야 했다(코드베이스에 30곳 이상).
 * 여기서 한 번 태그로 바꿔두면 그 분기가 `catchTag`로 대체된다.
 */

/** 서버가 블랙리스트 차단에 쓰는 에러코드 (services/be BlacklistErrorCode). */
const BLACKLISTED_USER_CODE = 'BLACKLISTED_USER';

/**
 * 403이 블랙리스트 차단인지 판별한다.
 *
 * 서버는 403을 블랙리스트 외에도 권한 부족(ACCESS_DENIED, BOOKING_ACCESS_DENIED)·
 * 비활성 계정(USER_NOT_ACTIVE)에 사용한다. status만 보고 차단하면 남의 예매를
 * 조회한 정상 사용자까지 차단 화면을 보게 된다.
 *
 * 예전에는 code가 없는 응답을 위해 "인터셉터가 걸린 경로 + 메시지에 '블랙리스트'
 * 포함" 폴백을 뒀지만, 서버 문구가 바뀌면 아무 에러 없이 차단이 풀리는 방식이었다.
 * 이제 be·auth 양쪽이 모든 실패에 code를 실으므로 code만 신뢰한다.
 */
const isBlacklistBlock = (path: string, code: string | undefined) => {
  if (path.includes('/api/v1/admin/')) {
    return false;
  }

  return code === BLACKLISTED_USER_CODE;
};

/**
 * 서버 응답 본문에서 에러코드 이름을 꺼낸다.
 *
 * 서버가 code를 싣기 전이거나(구버전) 성공 코드("OK")인 경우 undefined를 돌려준다.
 */
const readErrorCode = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const code = (data as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }

  const trimmed = code.trim();
  return trimmed === '' || trimmed === 'OK' ? undefined : trimmed;
};

/** 서버 응답 본문에서 사용자에게 보여줄 message만 꺼낸다. */
const readServerMessage = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const message = (data as { message?: unknown }).message;
  if (typeof message !== 'string') {
    return undefined;
  }

  const trimmed = message.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * 서버 응답 본문에서 분산 추적 식별자를 꺼낸다.
 *
 * 서버는 5xx에만 싣고, 추적이 꺼진 환경에서는 아예 필드를 내리지 않는다.
 */
const readTraceId = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const traceId = (data as { traceId?: unknown }).traceId;
  if (typeof traceId !== 'string') {
    return undefined;
  }

  const trimmed = traceId.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * 실패 응답(status·본문)을 대응하는 ApiFailure로 변환한다.
 *
 * 401은 여기서 만들지 않는다 — client가 토큰 리프레시를 먼저 시도하고,
 * 그 재시도까지 실패했을 때만 UnauthorizedError를 만든다.
 *
 * @param path   요청 경로 (에러에 실어 로깅·판별에 쓴다)
 * @param status HTTP 상태 코드
 * @param data   파싱된 응답 본문 (파싱 실패 시 null)
 */
export const toApiFailure = (
  path: string,
  status: number,
  data: unknown,
): ApiFailure => {
  const serverMessage = readServerMessage(data);
  // 서버가 실은 에러코드 이름. 같은 status에 섞인 사유를 가르는 근거다
  // (예: 409의 SEAT_LOCK_FAILED는 재시도 가능, SEAT_ALREADY_HELD는 아님).
  const code = readErrorCode(data);

  if (status === 401) {
    return new UnauthorizedError({ path, code, serverMessage });
  }

  if (status === 403) {
    return isBlacklistBlock(path, code)
      ? new BlacklistedError({ path, code, serverMessage })
      : new ForbiddenError({ path, code, serverMessage });
  }

  if (status === 404) {
    return new NotFoundError({ path, code, serverMessage });
  }

  if (status === 400) {
    return new ValidationError({ path, code, serverMessage, data });
  }

  if (status === 409) {
    return new ConflictError({ path, code, serverMessage, data });
  }

  if (status >= 500) {
    return new ServerError({
      path,
      status,
      code,
      serverMessage,
      traceId: readTraceId(data),
    });
  }

  return new ClientError({ path, status, code, serverMessage, data });
};
