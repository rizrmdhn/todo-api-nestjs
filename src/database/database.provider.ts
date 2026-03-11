import { Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import { DRIZZLE } from './drizzle.constants';
import * as schema from './schema';

export const DatabaseProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    const client = postgres(env.DATABASE_URL);
    return drizzle(client, { schema });
  },
};
