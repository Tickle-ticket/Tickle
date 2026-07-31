import { Data } from 'effect';

/**
 * API 실패를 태그로 구분한 에러 타입.
 *
 * 기존 `ApiError` 단일 클래스는 모든 실패를 `status` 숫자 하나로 뭉뚱그려,
 * 호출부가 "비회원이라 실패한 건지 · 서버가 죽은 건지 · 응답 형태가 바뀐 건지"를
 * 구분할 수 없었다. 특히 스키마 검증 실패에 HTTP status(200)를 재사용해
 * `retry`·`throwOnError` 정책이 오작동했다.
 *
 * 여기서는 실패를 발생 원인별로 나눠 `Effect`의 에러 채널에 싣는다.
 * 호출부는 `Effect.catchTag`로 필요한 케이스만 골라 다룰 수 있고,
 * 처리하지 않은 태그는 컴파일 타임에 남는다.
 */

/** 네트워크 자체가 실패했다(오프라인·DNS·CORS·서버 다운). 응답이 없다. */
export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly path: string;
  readonly cause: unknown;
}> {
  get message() {
    return '네트워크에 연결할 수 없습니다.';
  }
}

/** 요청이 제한 시간을 넘겨 중단됐다. */
export class TimeoutError extends Data.TaggedError('TimeoutError')<{
  readonly path: string;
  readonly timeoutMs: number;
}> {
  get message() {
    return '요청 시간이 초과되었습니다.';
  }
}

/**
 * 인증이 필요하거나 만료됐다(401). 리프레시까지 시도한 뒤의 최종 실패다.
 *
 * 비회원이 `auth: 'optional'` 리소스를 조회한 경우는 이 에러가 아니라
 * 비회원 응답으로 처리된다(client가 `auth: 'none'`으로 강등해 재시도).
 */
export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
  readonly path: string;
  readonly code?: string;
  readonly serverMessage?: string;
}> {
  get message() {
    return this.serverMessage ?? '로그인이 필요합니다.';
  }
}

/** 로그인은 했으나 권한이 없다(403). 블랙리스트는 아니다. */
export class ForbiddenError extends Data.TaggedError('ForbiddenError')<{
  readonly path: string;
  readonly code?: string;
  readonly serverMessage?: string;
}> {
  get message() {
    return this.serverMessage ?? '접근 권한이 없습니다.';
  }
}

/**
 * 블랙리스트로 차단됐다(403 중 특수 케이스).
 *
 * 서버가 에러코드 이름 없이 `{status, message}`만 내려주므로
 * 인터셉터가 걸린 경로 + 메시지를 함께 확인해 판별한다.
 */
export class BlacklistedError extends Data.TaggedError('BlacklistedError')<{
  readonly path: string;
  readonly code?: string;
  readonly serverMessage?: string;
}> {
  get message() {
    return this.serverMessage ?? '이용이 제한된 계정입니다.';
  }
}

/** 리소스가 없다(404). */
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly path: string;
  readonly code?: string;
  readonly serverMessage?: string;
}> {
  get message() {
    return this.serverMessage ?? '요청한 정보를 찾을 수 없습니다.';
  }
}

/**
 * 요청값이 잘못됐다(400).
 *
 * 대응이 화면마다 다르므로(입력 강조·안내 문구 등) Error Boundary로
 * 올리지 않고 호출부가 인라인으로 다루는 것이 기본이다.
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly path: string;
  readonly code?: string;
  readonly serverMessage?: string;
  readonly data?: unknown;
}> {
  get message() {
    return this.serverMessage ?? '요청을 처리할 수 없습니다.';
  }
}

/**
 * 현재 리소스 상태와 충돌한다(409).
 *
 * 티켓팅에서는 좌석 선점 경합·중복 예매처럼 "남이 먼저 가져간" 상황이라
 * 400과 의미가 다르다. 사용자가 다른 좌석을 고르거나 잠시 후 다시 시도하면
 * 성공할 수 있으므로, 화면이 맥락에 맞는 안내를 띄운다.
 */
export class ConflictError extends Data.TaggedError('ConflictError')<{
  readonly path: string;
  readonly code?: string;
  readonly serverMessage?: string;
  readonly data?: unknown;
}> {
  get message() {
    return this.serverMessage ?? '이미 처리된 요청이거나 다른 사용자가 선점했습니다.';
  }
}

/**
 * 위에서 다루지 않은 그 밖의 4xx(405·415·429 등).
 *
 * 개별 태그를 두기에는 화면 대응이 정해지지 않은 상태 코드를 모은다.
 * 잦아지는 코드가 생기면 전용 태그로 승격한다.
 */
export class ClientError extends Data.TaggedError('ClientError')<{
  readonly path: string;
  readonly status: number;
  readonly code?: string;
  readonly serverMessage?: string;
  readonly data?: unknown;
}> {
  get message() {
    return this.serverMessage ?? '요청을 처리할 수 없습니다.';
  }
}

/** 서버 내부 오류(5xx). 재시도할 가치가 있는 유일한 HTTP 실패다. */
export class ServerError extends Data.TaggedError('ServerError')<{
  readonly path: string;
  readonly status: number;
  readonly code?: string;
  readonly serverMessage?: string;
}> {
  get message() {
    return this.serverMessage ?? '일시적인 서버 오류입니다.';
  }
}

/**
 * HTTP는 성공(2xx)했으나 응답 본문이 스키마와 다르다.
 *
 * 서버 계약이 바뀌었거나 프론트 스키마가 낡았다는 신호이며 사용자가
 * 재시도해도 해결되지 않는다. HTTP status와 분리해야 재시도 정책이
 * "200인데 에러"인 유령 상태를 만들지 않는다.
 */
export class SchemaMismatchError extends Data.TaggedError('SchemaMismatchError')<{
  readonly path: string;
  readonly cause: unknown;
  readonly received: unknown;
}> {
  get message() {
    return '서버 응답 형식이 올바르지 않습니다.';
  }
}

/** apiClient가 실패 채널에 실을 수 있는 모든 에러. */
export type ApiFailure =
  | NetworkError
  | TimeoutError
  | UnauthorizedError
  | ForbiddenError
  | BlacklistedError
  | NotFoundError
  | ValidationError
  | ConflictError
  | ClientError
  | ServerError
  | SchemaMismatchError;

/**
 * 서버가 "요청이 몰려 처리하지 못했다"는 뜻으로 내려주는 에러코드.
 *
 * 같은 409라도 성격이 다르다 — SEAT_ALREADY_HELD는 남이 가져갔으니 다른 좌석을
 * 골라야 하지만, 이 코드들은 분산락 획득에 실패한 것이라 **잠시 후 다시 시도하면
 * 성공할 수 있다**. status만으로는 구분할 수 없어 code를 본다.
 */
const RETRYABLE_CONFLICT_CODES = new Set(['SEAT_LOCK_FAILED', 'CANDIDATE_LOCK_FAILED']);

/**
 * 재시도가 의미 있는 실패인지 판별한다.
 *
 * 네트워크·타임아웃·5xx는 일시적 장애이므로 항상 재시도할 가치가 있다.
 * 409는 대부분 재시도해도 같은 결과지만, 락 경합 실패만은 예외다.
 */
export const isRetryable = (error: ApiFailure): boolean => {
  if (
    error._tag === 'NetworkError' ||
    error._tag === 'TimeoutError' ||
    error._tag === 'ServerError'
  ) {
    return true;
  }

  return error._tag === 'ConflictError' && !!error.code && RETRYABLE_CONFLICT_CODES.has(error.code);
};

/**
 * 블랙리스트 차단인지 판별한다.
 *
 * 서버가 code를 주기 전에는 경로와 메시지 문구로 추측해야 했다(문구가 바뀌면
 * 조용히 깨지는 방식). 이제 code로 정확히 판별한다.
 */
export const isBlacklisted = (error: ApiFailure): boolean =>
  error._tag === 'BlacklistedError' ||
  (error._tag === 'ForbiddenError' && error.code === 'BLACKLISTED_USER');

/**
 * 액세스 토큰이 만료됐을 뿐인지 판별한다.
 *
 * 만료라면 리프레시로 복구되지만, 위조·로그아웃된 토큰이라면 재로그인이 필요하다.
 * 둘 다 401이라 status로는 나눌 수 없다.
 */
export const isTokenExpired = (error: ApiFailure): boolean =>
  error._tag === 'UnauthorizedError' && error.code === 'EXPIRED_TOKEN';

/**
 * 화면을 에러 페이지로 대체할지에 대한 **기본값**을 판별한다.
 *
 * 호출부가 아무것도 하지 않았을 때만 적용된다(QueryProvider의 throwOnError).
 * 같은 NotFoundError라도 상세 진입 실패는 보여줄 것이 없어 페이지를 교체해야
 * 하지만, 좌석 선점 실패는 선택 중인 화면을 살려둬야 한다. 후자처럼 맥락이
 * 있는 화면은 catchTag로 에러를 직접 가져가므로 이 기본값에 도달하지 않는다.
 *
 * 4xx 중 입력값·상태 충돌(ValidationError·ConflictError)은 대응이 화면마다
 * 달라 기본값으로 페이지를 대체하지 않는다.
 */
export const isFatalByDefault = (error: ApiFailure): boolean =>
  error._tag === 'ForbiddenError' ||
  error._tag === 'BlacklistedError' ||
  error._tag === 'NotFoundError' ||
  error._tag === 'ServerError' ||
  error._tag === 'SchemaMismatchError';

/** ErrorView 계열이 쓰는 표시용 status를 되돌려준다(로깅·문구용). */
export const toDisplayStatus = (error: ApiFailure): number | undefined => {
  switch (error._tag) {
    case 'UnauthorizedError':
      return 401;
    case 'ForbiddenError':
    case 'BlacklistedError':
      return 403;
    case 'NotFoundError':
      return 404;
    case 'TimeoutError':
      return 408;
    case 'ValidationError':
      return 400;
    case 'ConflictError':
      return 409;
    case 'ClientError':
    case 'ServerError':
      return error.status;
    // 네트워크·스키마 실패는 대응하는 HTTP status가 없다.
    case 'NetworkError':
    case 'SchemaMismatchError':
      return undefined;
  }
};
