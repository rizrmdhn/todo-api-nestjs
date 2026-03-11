import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../database/drizzle.constants';
import * as schema from '../../database/schema';
import { NewUser, users } from './users.schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  /**
   * Find a user by their email address.
   * Used during login to look up the account before verifying the password.
   *
   * @returns The user record, or undefined if no match is found.
   */
  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  /**
   * Find a user by their ID.
   * Used when refreshing tokens to confirm the user still exists.
   *
   * @returns The user record, or undefined if not found.
   */
  async findById(id: number) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Insert a new user into the database and return the created record.
   * The password passed here must already be hashed.
   */
  async create(data: NewUser) {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }
}
