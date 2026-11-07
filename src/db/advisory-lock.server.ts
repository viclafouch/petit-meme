import type { Prisma } from './generated/prisma/client'

export const lockUntilTransactionEnds = async (
  transaction: Prisma.TransactionClient,
  key: string
) => {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`
}
