import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { env } from '../../config/env';
import { ErrorResponse } from '../types/api-response.type';

/**
 * Catches all exceptions and formats them into the standard ErrorResponse shape.
 *
 * Handles three cases:
 *  1. ZodValidationException  → 400 with structured field errors
 *  2. HttpException           → uses the exception's status + message
 *  3. Unexpected errors       → 500, hides stack in production
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, unknown> | undefined;
    let stack: string | undefined;

    if (exception instanceof ZodValidationException) {
      /**
       * ZodValidationException is thrown by ZodValidationPipe.
       * We flatten zod errors into { field: message } pairs.
       */
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      /**
       * z.flattenError produces { formErrors: string[], fieldErrors: Record<string, string[]> }
       * fieldErrors maps each field name to its validation messages.
       * formErrors captures top-level errors not tied to a specific field.
       */
      const flattened = z.flattenError(exception.getZodError() as z.ZodError);
      errors = {
        ...flattened.fieldErrors,
        ...(flattened.formErrors.length > 0 && {
          _errors: flattened.formErrors,
        }),
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : (((body as Record<string, unknown>).message as string) ?? message);
    } else if (exception instanceof Error) {
      /** Unexpected crash — keep vague message in prod, expose stack in dev */
      message = exception.message;
      stack = exception.stack;
    }

    const payload: ErrorResponse = {
      success: false,
      status: status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'error' : 'fail',
      statusCode: status,
      message,
      ...(errors && { errors }),
      ...(env.NODE_ENV === 'development' && stack && { stack }),
    };

    response.status(status).json(payload);
  }
}
