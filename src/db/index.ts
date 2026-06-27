import { PrismaPg } from '@prisma/adapter-pg'
import { IS_PRODUCTION } from '~/constants/env'
import { PrismaClient } from './generated/prisma/client'

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5000
  })

  return new PrismaClient({ adapter })
}

// oxlint-disable-next-line no-shadow-restricted-names -- standard Prisma singleton pattern
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

// oxlint-disable-next-line typescript/no-unnecessary-condition -- globalThis.prismaGlobal may be undefined at first run
export const prismaClient = globalThis.prismaGlobal ?? prismaClientSingleton()

if (!IS_PRODUCTION) {
  globalThis.prismaGlobal = prismaClient
}
