import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { attachDatabasePool } from '@vercel/functions'
import { IS_PRODUCTION } from '~/constants/env'
import { MEME_FILL_OMIT } from '~/constants/meme-fill'
import { serverEnv } from '~/env/server.server'
import { PrismaClient } from './generated/prisma/client'

export const DATABASE_POOL_MAX_CONNECTIONS = 5

const prismaClientSingleton = () => {
  const pool = new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: DATABASE_POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5000
  })

  attachDatabasePool(pool)

  return new PrismaClient({
    adapter: new PrismaPg(pool),
    omit: { meme: MEME_FILL_OMIT }
  })
}

declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prismaClient = globalThis.prismaGlobal ?? prismaClientSingleton()

if (!IS_PRODUCTION) {
  globalThis.prismaGlobal = prismaClient
}
