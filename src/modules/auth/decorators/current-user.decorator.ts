import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from '../auth.service';

/**
 * Parameter decorator that extracts the authenticated user's payload
 * from the request object. Must be used on routes protected by JwtGuard,
 * which is responsible for populating request.user.
 *
 * @example
 * @Get('me')
 * @UseGuards(JwtGuard)
 * getMe(@CurrentUser() user: AccessTokenPayload) {
 *   return user; // { sub: 1, email: 'user@example.com' }
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request['user'] as AccessTokenPayload;
  },
);
