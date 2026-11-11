import { z } from 'zod'
import { CATEGORY_SLUG_REGEX } from '~/constants/meme'
import { buildLocaleRecord } from '~/helpers/i18n-content'

const CATEGORY_TITLE_MIN_LENGTH = 3
const CATEGORY_TITLE_MAX_LENGTH = 100
const CATEGORY_KEYWORD_MAX_LENGTH = 50
const CATEGORY_KEYWORDS_MAX_COUNT = 20

const CATEGORY_TRANSLATION_SCHEMA = z.object({
  title: z
    .string()
    .min(CATEGORY_TITLE_MIN_LENGTH)
    .max(CATEGORY_TITLE_MAX_LENGTH),
  keywords: z
    .array(z.string().max(CATEGORY_KEYWORD_MAX_LENGTH))
    .max(CATEGORY_KEYWORDS_MAX_COUNT)
})

export const CATEGORY_FORM_SCHEMA = z.object({
  slug: z.string().regex(CATEGORY_SLUG_REGEX),
  translations: z.object(
    buildLocaleRecord(() => {
      return CATEGORY_TRANSLATION_SCHEMA
    })
  )
})
