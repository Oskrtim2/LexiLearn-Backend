import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

// Prisma stops loading .env automatically once a config file is present.
// Existing process environment variables (production/container) still win.
try {
  loadEnvFile();
} catch {
  // No local .env file: configuration comes from the process environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
