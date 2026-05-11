export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  auth?: 'required' | 'optional' | 'none';
}
