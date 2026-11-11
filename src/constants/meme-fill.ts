import type { Prisma } from '~/db/generated/prisma/client'
import { SECOND } from './time.ts'

export const MEME_FILL_OMIT = {
  fillStatus: true,
  fillAttempts: true,
  fillDoubt: true,
  fillSuggestion: true,
  fillWrittenAt: true
} as const satisfies Prisma.MemeOmit

export const MEME_FILL_MAX_DURATION_SECONDS = 800

export const MEME_FILL_MAX_DURATION_MS = MEME_FILL_MAX_DURATION_SECONDS * SECOND

export const MEME_FILL_MAX_ATTEMPTS = 3

export const MEME_FILL_CUSTOM_PROMPT_MAX_LENGTH = 500

export const MEME_FILL_PATH = '/api/meme-fill'
