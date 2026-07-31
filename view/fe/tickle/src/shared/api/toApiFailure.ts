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

// 서버에서 BlacklistInterceptor가 적용된 경로 (services/be WebMvcConfig#addInterceptors).
// 이 경로 밖의 403은 블랙리스트일 수 없다.
const BLACKLIST_GUARDED_PATHS = ['/api/v1/queue/', '/api/v1/reservations/'];

/**
 * 403이 블랙리스트 차단인지 판별한다.
 *
 * 서버는 403을 블랙리스트(BLACKLISTED_USER) 외에도 권한 부족(ACCESS_DENIED,
 * BOOKING_ACCESS_DENIED)·비활성 계정(USER_NOT_ACTIVE)에 사용하며,
 * GlobalExceptionHandler가 에러코드 이름 없이 {status, message}만 내려준다.
 * status만 보고 차단하면 남의 예매를 조회한 정상 사용자까지 차단 화면을 보게 되므로,
 * 인터셉터가 걸린 경로와 메시지를 함께 확인한다.
 */
const isBlacklistBlock = (path: string, serverMessage: string | undefined) => {
  if (path.includes('/api/v1/admin/')) {
    return false;
  }

  const isGuardedPath = BLACKLIST_GUARDED_PATHS.some((guardedPath) =>
    path.includes(guardedPath),
  );

  return isGuardedPath && (serverMessage?.includes('블랙리스트') ?? false);
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

  if (status === 401) {
    return new UnauthorizedError({ path, serverMessage });
  }

  if (status === 403) {
    return isBlacklistBlock(path, serverMessage)
      ? new BlacklistedError({ path, serverMessage })
      : new ForbiddenError({ path, serverMessage });
  }

  if (status === 404) {
    return new NotFoundError({ path, serverMessage });
  }

  if (status === 400) {
    return new ValidationError({ path, serverMessage, data });
  }

  if (status === 409) {
    return new ConflictError({ path, serverMessage, data });
  }

  if (status >= 500) {
    return new ServerError({ path, status, serverMessage });
  }

  return new ClientError({ path, status, serverMessage, data });
};
