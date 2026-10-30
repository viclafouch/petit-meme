import { z } from 'zod'
import { MemeContentLocale } from '~/db/generated/prisma/enums'

export const AI_SEARCH_MODEL = 'claude-haiku-5-5'
export const FREE_PLAN_MAX_AI_SEARCHES = 3
export const MAX_PROMPT_LENGTH = 300
export const MAX_AI_SEARCH_RESULTS = 20
export const DAILY_GLOBAL_AI_SEARCH_CAP = 500
export const AI_SEARCH_TIMEOUT_MS = 15_000
export const AI_SEARCH_QUOTA_EXCEEDED_MESSAGE = 'AI search quota exceeded'
export const AI_SEARCH_PROMPT_STORAGE_KEY = 'ai-search-prompt'

export const AI_SEARCH_STAGE_KEYS = [
  'context',
  'keywords',
  'search'
] as const satisfies readonly string[]

export const AI_SEARCH_STAGE_MIN_DELAY_MS = 1500
export const AI_SEARCH_STAGE_MAX_DELAY_MS = 2500
export const AI_SEARCH_STAGE_LINGER_MS = 600

const CONTROL_CHARACTER_OTHER_THAN_LINE_BREAK_OR_TAB = /(?![\t\n\r])\p{Cc}/u

export const AI_SEARCH_INPUT_SCHEMA = z.object({
  prompt: z
    .string()
    .trim()
    .min(1)
    .max(MAX_PROMPT_LENGTH)
    .refine((prompt) => {
      return !CONTROL_CHARACTER_OTHER_THAN_LINE_BREAK_OR_TAB.test(prompt)
    }),
  contentLocale: z.enum([MemeContentLocale.FR, MemeContentLocale.EN]).optional()
})
