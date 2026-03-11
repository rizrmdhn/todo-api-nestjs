import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  completed: z.boolean().optional(),
});

export class UpdateTodoDto extends createZodDto(UpdateTodoSchema) {}
