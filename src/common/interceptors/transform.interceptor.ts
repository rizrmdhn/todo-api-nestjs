import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiMeta, SuccessResponse } from '../types/api-response.type';

interface WrappedPayload<T> {
  data: T;
  message?: string;
  meta?: ApiMeta;
}

/**
 * Wraps every successful controller response in the standard ApiResponse shape.
 *
 * Controllers can return either:
 *   - Plain data           → { data, message: 'Success' }
 *   - { data, message? }  → uses the custom message
 *   - { data, meta? }     → includes pagination meta
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((payload: T | WrappedPayload<T>) => {
        /**
         * If the controller returned { data, message?, meta? },
         * destructure it. Otherwise treat the whole return value as data.
         */
        const isWrapped =
          payload !== null && typeof payload === 'object' && 'data' in payload;

        const wrapped = payload as WrappedPayload<T>;
        const data: T = isWrapped ? wrapped.data : payload;
        const message: string = isWrapped
          ? (wrapped.message ?? 'Success')
          : 'Success';
        const meta: ApiMeta | undefined = isWrapped ? wrapped.meta : undefined;

        return {
          success: true as const,
          status: 'success' as const,
          statusCode: response.statusCode,
          message,
          data,
          ...(meta && { meta }),
        };
      }),
    );
  }
}
