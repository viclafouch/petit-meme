import type { MemeContentLocale } from '@/db/generated/prisma/enums'
import type { CategoryTranslationModel } from '@/db/generated/prisma/models/CategoryTranslation'
import type { MemeTranslationModel } from '@/db/generated/prisma/models/MemeTranslation'
import type { Locale } from '@/paraglide/runtime'

const CONTENT_LOCALE_TO_LOCALE = {
  FR: 'fr',
  EN: 'en',
  UNIVERSAL: 'fr'
} as const satisfies Record<MemeContentLocale, Locale>

export const VISIBLE_CONTENT_LOCALES = {
  fr: ['FR', 'EN', 'UNIVERSAL'],
  en: ['EN', 'UNIVERSAL']
} satisfies Record<Locale, MemeContentLocale[]>

const findTranslation = <T extends { locale: string }>(
  translations: T[],
  localePriority: readonly string[]
): T | undefined => {
  return localePriority
    .map((locale) => {
      return translations.find((translation) => {
        return translation.locale === locale
      })
    })
    .find((match) => {
      return match !== undefined
    })
}

type ResolveMemeTranslationParams = {
  translations: Pick<
    MemeTranslationModel,
    'locale' | 'title' | 'description' | 'keywords'
  >[]
  contentLocale: MemeContentLocale
  requestedLocale: Locale
  fallback: Pick<MemeTranslationModel, 'title' | 'description' | 'keywords'>
}

export const resolveMemeTranslation = ({
  translations,
  contentLocale,
  requestedLocale,
  fallback
}: ResolveMemeTranslationParams) => {
  const sourceLocale = CONTENT_LOCALE_TO_LOCALE[contentLocale]
  const match = findTranslation(translations, [requestedLocale, sourceLocale])

  return {
    title: match?.title ?? fallback.title,
    description: match?.description ?? fallback.description,
    keywords: match?.keywords ?? fallback.keywords
  }
}

type ResolveCategoryTranslationParams = {
  translations: Pick<
    CategoryTranslationModel,
    'locale' | 'title' | 'keywords'
  >[]
  requestedLocale: Locale
  fallback: Pick<CategoryTranslationModel, 'title' | 'keywords'>
}

export const resolveCategoryTranslation = ({
  translations,
  requestedLocale,
  fallback
}: ResolveCategoryTranslationParams) => {
  const match = findTranslation(translations, [requestedLocale])

  return {
    title: match?.title ?? fallback.title,
    keywords: match?.keywords ?? fallback.keywords
  }
}
