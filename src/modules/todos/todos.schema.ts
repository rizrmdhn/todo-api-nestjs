import { boolean, serial, text } from 'drizzle-orm/pg-core';
import { createTable, timestamps } from '../../database/helpers';

export const todos = createTable('todos', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  ...timestamps,
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
