import { Prisma } from '~/db/generated/prisma/client'

const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT_FAILED: 'P2002',
  RECORD_NOT_FOUND: 'P2025'
} as const satisfies Record<string, string>

type PrismaErrorName = keyof typeof PRISMA_ERROR_CODES

export const matchIsPrismaError = (error: unknown, name: PrismaErrorName) => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_ERROR_CODES[name]
  )
}
