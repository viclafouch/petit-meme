import { IS_PRODUCTION } from '~/constants/env'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000
  })

  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

export const prismaClient = globalThis.prismaGlobal ?? prismaClientSingleton()

if (!IS_PRODUCTION) {
  globalThis.prismaGlobal = prismaClient
}
