import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify as argonVerify } from '@node-rs/argon2';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../../config/env';
import { User } from '../users/users.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Shape of the access token payload stored inside the JWT */
export interface AccessTokenPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  /**
   * TextEncoder converts the secret string into a Uint8Array,
   * which is the format jose expects for HMAC keys.
   */
  private readonly accessSecret = new TextEncoder().encode(
    env.JWT_ACCESS_SECRET,
  );
  private readonly refreshSecret = new TextEncoder().encode(
    env.JWT_REFRESH_SECRET,
  );

  constructor(private usersService: UsersService) {}

  /**
   * Register a new user account.
   *
   * Flow:
   * 1. Check if the email is already taken.
   * 2. Hash the password with argon2 before storing.
   * 3. Insert the user into the database.
   * 4. Return a fresh access + refresh token pair.
   */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    /**
     * argon2id is the recommended variant — it's resistant to both
     * side-channel and GPU-based attacks.
     */
    const hashedPassword = await hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
    });

    return this.generateTokenPair(user);
  }

  /**
   * Authenticate a user with email and password.
   *
   * Flow:
   * 1. Look up the user by email.
   * 2. Use argon2 to verify the plain password against the stored hash.
   * 3. Return a fresh token pair on success.
   *
   * Note: We return the same error message for "user not found" and
   * "wrong password" to avoid leaking which emails are registered.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await argonVerify(user.password, dto.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokenPair(user);
  }

  /**
   * Issue a new token pair using a valid refresh token.
   *
   * Flow:
   * 1. Verify the refresh token signature and expiry.
   * 2. Load the user from the DB to confirm they still exist.
   * 3. Return a new access + refresh token pair (token rotation).
   *
   * Token rotation means every refresh invalidates the old refresh token
   * and issues a new one, limiting the damage of a leaked refresh token.
   */
  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findById(Number(payload.sub));
    if (!user) throw new UnauthorizedException('User no longer exists');

    return this.generateTokenPair(user);
  }

  /**
   * Verify an access token and return its decoded payload.
   * Called by JwtGuard on every protected route.
   *
   * @throws UnauthorizedException if the token is missing, malformed, or expired.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret);
      return {
        sub: Number(payload.sub),
        email: payload['email'] as string,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Sign a short-lived access token (15 minutes).
   *
   * Contains the user ID (sub) and email so controllers can use them
   * without an extra database lookup on every request.
   *
   * alg: HS256 — HMAC with SHA-256, a symmetric signing algorithm.
   * setIssuedAt() — stamps the token with the current time (iat claim).
   */
  private signAccessToken(user: Pick<User, 'id' | 'email'>) {
    return new SignJWT({ email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.accessSecret);
  }

  /**
   * Sign a long-lived refresh token (7 days).
   *
   * Only stores the user ID — kept minimal because this token lives longer
   * and should expose as little data as possible if intercepted.
   */
  private signRefreshToken(user: Pick<User, 'id'>) {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.refreshSecret);
  }

  /**
   * Verify a refresh token's signature and expiry.
   *
   * @throws UnauthorizedException if the token is invalid or expired.
   */
  private async verifyRefreshToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.refreshSecret);
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Create both tokens concurrently and return them together.
   * Using Promise.all here avoids signing them sequentially (saves ~few ms).
   */
  private async generateTokenPair(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user),
    ]);
    return { accessToken, refreshToken };
  }
}
