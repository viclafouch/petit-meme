/* oxlint-disable no-console */
import { prismaClient } from '~/db'
import { E2E_DATABASE_URL } from './env'

export const clearDatabase = async () => {
  if (process.env.DATABASE_URL !== E2E_DATABASE_URL) {
    throw new Error(
      'DATABASE_URL does not come from .env.e2e: refusing to empty a database the suite does not own.'
    )
  }

  const tables = await prismaClient.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `

  const quoted = tables
    .map((table) => {
      return `"public"."${table.tablename}"`
    })
    .join(', ')

  await prismaClient.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`
  )

  console.log(`  ${tables.length} tables cleared`)
}
