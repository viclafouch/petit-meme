import { config as loadDotenv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

loadDotenv()

// oxlint-disable-next-line node/no-process-env -- the Prisma CLI config reads the optional direct connection string, which prisma/config's env() cannot leave unset
const directUrl = process.env.DIRECT_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: directUrl ?? env('DATABASE_URL')
  }
})
