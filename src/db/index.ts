import { PrismaPg } from '@prisma/adapter-pg'
import { IS_PRODUCTION } from '~/constants/env'
import { baseEnv } from '~/env/base'
import { PrismaClient } from './generated/prisma/client'

export const DATABASE_POOL_MAX_CONNECTIONS = 5

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: baseEnv.DATABASE_URL,
    max: DATABASE_POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5000
  })

  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prismaClient = globalThis.prismaGlobal ?? prismaClientSingleton()

if (!IS_PRODUCTION) {
  globalThis.prismaGlobal = prismaClient
}
