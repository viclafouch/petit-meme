import type { MemeContentLocale } from '@/db/generated/prisma/enums'
import type { CategoryTranslationModel } from '@/db/generated/prisma/models/CategoryTranslation'
import type { MemeTranslationModel } from '@/db/generated/prisma/models/MemeTranslation'
import { type Locale, locales } from '@/paraglide/runtime'

type LocaleMeta = {
  flag: string
  label: string
}

export const LOCALE_META = {
  fr: { flag: '🇫🇷', label: 'Français' },
  en: { flag: '🇬🇧', label: 'English' }
} as const satisfies Record<Locale, LocaleMeta>

export const CONTENT_LOCALE_META = {
  FR: { flag: '🇫🇷', label: 'Français' },
  EN: { flag: '🇬🇧', label: 'Anglais' },
  UNIVERSAL: { flag: '🌍', label: 'Universel' }
} as const satisfies Record<MemeContentLocale, LocaleMeta>

export const CONTENT_LOCALE_OPTIONS = Object.entries(CONTENT_LOCALE_META).map(
  ([value, meta]) => {
    return {
      value: value as MemeContentLocale,
      label: `${meta.flag} ${meta.label}`
    }
  }
)

export const CONTENT_LOCALE_TO_LOCALE = {
  FR: 'fr',
  EN: 'en',
  UNIVERSAL: 'fr'
} as const satisfies Record<MemeContentLocale, Locale>

export const REQUIRED_TRANSLATION_LOCALES = {
  FR: ['fr'],
  EN: ['en'],
  UNIVERSAL: ['fr', 'en']
} as const satisfies Record<MemeContentLocale, readonly Locale[]>

export const VISIBLE_CONTENT_LOCALES = {
  fr: ['FR', 'EN', 'UNIVERSAL'],
  en: ['EN', 'UNIVERSAL']
} satisfies Record<Locale, MemeContentLocale[]>

export const buildLocaleRecord = <T>(factory: (locale: Locale) => T) => {
  return Object.fromEntries(
    locales.map((locale) => {
      return [locale, factory(locale)]
    })
  ) as Record<Locale, T>
}

export const findTranslationByLocale = <T extends { locale: string }>(
  translations: T[],
  locale: string
) => {
  return translations.find((translation) => {
    return translation.locale === locale
  })
}

const findTranslationWithPriority = <T extends { locale: string }>(
  translations: T[],
  localePriority: readonly string[]
) => {
  for (const locale of localePriority) {
    const match = findTranslationByLocale(translations, locale)

    if (match !== undefined) {
      return match
    }
  }

  // eslint-disable-next-line consistent-return, unicorn/no-useless-undefined -- find-like function returns T | undefined
  return undefined
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
  const match = findTranslationWithPriority(translations, [
    requestedLocale,
    sourceLocale
  ])

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
  const match = findTranslationByLocale(translations, requestedLocale)

  return {
    title: match?.title ?? fallback.title,
    keywords: match?.keywords ?? fallback.keywords
  }
}
