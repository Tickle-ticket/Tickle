export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean>;
  body?: any; // JSON 객체 또는 FormData를 모두 허용
}
