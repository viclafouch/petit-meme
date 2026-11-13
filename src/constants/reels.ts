import { z } from 'zod'

export const REELS_PAGE_SIZE = 8

export const MAX_REELS_SEED = 1_000_000

const MAX_REELS_OFFSET = 100_000

export const REELS_CURSOR_SCHEMA = z
  .object({
    seed: z.number().int().min(0).max(MAX_REELS_SEED),
    offset: z.number().int().min(0).max(MAX_REELS_OFFSET)
  })
  .nullable()

export type ReelsCursor = z.infer<typeof REELS_CURSOR_SCHEMA>
