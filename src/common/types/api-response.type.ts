export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface SuccessResponse<T> {
  success: true;
  status: 'success';
  statusCode: number;
  message: string;
  data: T;
  meta?: ApiMeta;
}

export interface ErrorResponse {
  success: false;
  status: 'fail' | 'error';
  statusCode: number;
  message: string;
  errors?: Record<string, unknown>;
  stack?: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
