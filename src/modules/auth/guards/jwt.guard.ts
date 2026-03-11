import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

/**
 * JwtGuard protects routes by validating the Bearer token in the
 * Authorization header. Apply it with @UseGuards(JwtGuard).
 *
 * On success, the decoded token payload is attached to request.user,
 * making it accessible via the @CurrentUser() decorator.
 *
 * @example
 * @Get('me')
 * @UseGuards(JwtGuard)
 * getMe(@CurrentUser() user: AccessTokenPayload) { ... }
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) throw new UnauthorizedException('No token provided');

    /**
     * verifyAccessToken throws UnauthorizedException on failure,
     * so if we reach the next line, the token is valid.
     */
    const payload = await this.authService.verifyAccessToken(token);
    request['user'] = payload;

    return true;
  }

  /**
   * Extract the token from the Authorization header.
   * Expected format: "Authorization: Bearer <token>"
   *
   * @returns The raw JWT string, or undefined if the header is missing/malformed.
   */
  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
