export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
}

/**
 * API 실패를 나타내는 에러입니다.
 *
 * 화면 대부분이 `error.status`로 분기하고 있어 기존 형태를 유지하되,
 * 서버가 내려준 에러코드(`code`)와 태그드 에러(`failure`)를 함께 싣는다.
 * 새 코드는 `failure`로 `catchTag`·헬퍼(isRetryable 등)를 쓸 수 있고,
 * 기존 코드는 그대로 동작한다.
 */
export class ApiError extends Error {
  public status: number;
  public data?: unknown;
  /** 서버가 실은 에러코드 이름 (예: SEAT_LOCK_FAILED). 구버전 응답에는 없다. */
  public code?: string;
  /**
   * 같은 실패를 태그로 표현한 것.
   *
   * ApiFailure를 직접 import하면 types.ts ↔ errors.ts가 순환 참조하므로
   * 여기서는 최소 형태만 선언한다. 소비처는 errors.ts의 헬퍼를 쓴다.
   */
  public failure?: { readonly _tag: string; readonly code?: string };

  constructor(
    message: string,
    status: number,
    data?: unknown,
    options?: { code?: string; failure?: { readonly _tag: string; readonly code?: string } },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = options?.code;
    this.failure = options?.failure;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  auth?: 'required' | 'optional' | 'none';
}
