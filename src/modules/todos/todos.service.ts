import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../database/drizzle.constants';
import * as schema from '../../database/schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { todos } from './todos.schema';

@Injectable()
export class TodosService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
  ) {}

  findAll() {
    return this.db.select().from(todos);
  }

  async findOne(id: number) {
    const [todo] = await this.db
      .select()
      .from(todos)
      .where(eq(todos.id, id));

    if (!todo) throw new NotFoundException(`Todo #${id} not found`);
    return todo;
  }

  async create(dto: CreateTodoDto) {
    const [todo] = await this.db.insert(todos).values(dto).returning();
    return todo;
  }

  async update(id: number, dto: UpdateTodoDto) {
    await this.findOne(id);
    const [todo] = await this.db
      .update(todos)
      .set(dto)
      .where(eq(todos.id, id))
      .returning();
    return todo;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.delete(todos).where(eq(todos.id, id));
  }
}
