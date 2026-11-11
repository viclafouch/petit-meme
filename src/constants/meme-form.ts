import { z } from 'zod'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import {
  MemeContentLocale as MemeContentLocaleEnum,
  MemeStatus
} from '~/db/generated/prisma/enums'
import {
  buildLocaleRecord,
  REQUIRED_TRANSLATION_LOCALES
} from '~/helpers/i18n-content'

export const MEME_DESCRIPTION_MAX_LENGTH = 200

export const MEME_TITLE_MIN_LENGTH = 3
const MEME_TITLE_MAX_LENGTH = 100
const MEME_KEYWORD_MAX_LENGTH = 50
const MEME_KEYWORDS_MAX_COUNT = 20
const MEME_CATEGORIES_MAX_COUNT = 10

const MEME_TRANSLATION_SCHEMA = z.object({
  title: z.string().max(MEME_TITLE_MAX_LENGTH),
  description: z.string().max(MEME_DESCRIPTION_MAX_LENGTH),
  keywords: z
    .array(z.string().max(MEME_KEYWORD_MAX_LENGTH))
    .max(MEME_KEYWORDS_MAX_COUNT)
})

export const REQUIRED_MEME_TRANSLATION_SCHEMA = MEME_TRANSLATION_SCHEMA.extend({
  title: z.string().min(MEME_TITLE_MIN_LENGTH).max(MEME_TITLE_MAX_LENGTH)
})

export const MEME_FORM_SCHEMA = z.object({
  contentLocale: z.enum(MemeContentLocaleEnum),
  translations: z.object(
    buildLocaleRecord(() => {
      return MEME_TRANSLATION_SCHEMA
    })
  ),
  categoryIds: z.array(z.string()).max(MEME_CATEGORIES_MAX_COUNT),
  tweetUrl: TWEET_LINK_SCHEMA.nullable().or(
    z
      .string()
      .length(0)
      .transform(() => {
        return null
      })
  )
})

export const PUBLISHABLE_MEME_FORM_SCHEMA = MEME_FORM_SCHEMA.superRefine(
  (data, refinementContext) => {
    const requiredLocales = REQUIRED_TRANSLATION_LOCALES[data.contentLocale]

    for (const locale of requiredLocales) {
      const result = REQUIRED_MEME_TRANSLATION_SCHEMA.safeParse(
        data.translations[locale]
      )

      if (!result.success) {
        for (const issue of result.error.issues) {
          refinementContext.addIssue({
            ...issue,
            path: ['translations', locale, ...issue.path]
          })
        }
      }
    }
  }
)

export const getMemeFormSchema = (status: MemeStatus) => {
  return status === MemeStatus.PUBLISHED
    ? PUBLISHABLE_MEME_FORM_SCHEMA
    : MEME_FORM_SCHEMA
}
