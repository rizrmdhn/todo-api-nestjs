import { serial, text } from 'drizzle-orm/pg-core';
import { createTable, timestamps } from '../../database/helpers';

export const users = createTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  /** Stores the argon2 hash — never the plain password */
  password: text('password').notNull(),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
