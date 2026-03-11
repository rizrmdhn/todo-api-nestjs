import { sql } from 'drizzle-orm';
import { pgTableCreator, timestamp } from 'drizzle-orm/pg-core';

export const createTable = pgTableCreator((name) => `${name}`);

export const timestamps = {
  deletedAt: timestamp('deleted_at', {
    withTimezone: true,
    mode: 'string',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'string',
  }).$onUpdateFn(() => sql`CURRENT_TIMESTAMP`),
};
