import { z } from 'zod'
import { locales } from '~/paraglide/runtime'

export const MEME_FILL_SUGGESTION_SCHEMA = z.partialRecord(
  z.enum(locales),
  z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string())
  })
)

export type MemeFillSuggestion = z.infer<typeof MEME_FILL_SUGGESTION_SCHEMA>
