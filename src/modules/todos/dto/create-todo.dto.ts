import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
});

export class CreateTodoDto extends createZodDto(CreateTodoSchema) {}
