import { defineConfig, env } from 'prisma/config'
import 'dotenv/config'

const migrationDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ?? env('DATABASE_URL')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: migrationDatabaseUrl
  }
})
