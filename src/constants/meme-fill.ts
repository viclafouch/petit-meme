import type { Prisma } from '~/db/generated/prisma/client'

export const MEME_FILL_OMIT = {
  fillStatus: true,
  fillAttempts: true,
  fillDoubt: true
} as const satisfies Prisma.MemeOmit

export const MEME_FILL_MAX_DURATION_SECONDS = 800
