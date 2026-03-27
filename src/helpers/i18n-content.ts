import {
  type MemeContentLocale,
  MemeContentLocale as MemeContentLocaleEnum
} from '~/db/generated/prisma/enums'
import type { CategoryTranslationModel } from '~/db/generated/prisma/models/CategoryTranslation'
import type { MemeTranslationModel } from '~/db/generated/prisma/models/MemeTranslation'
import { m } from '~/paraglide/messages.js'
import { type Locale, locales } from '~/paraglide/runtime'
import { removeDuplicates } from '~/utils/array'

type LocaleMeta = {
  label: string
}

export const LOCALE_META = {
  fr: { label: 'Français' },
  en: { label: 'English' }
} as const satisfies Record<Locale, LocaleMeta>

type ContentLocaleMessageKey = `meme_content_locale_${MemeContentLocale}`

export const getContentLocaleLabel = (
  contentLocale: MemeContentLocale
): string => {
  const key: ContentLocaleMessageKey = `meme_content_locale_${contentLocale}`

  return m[key]()
}

export const getContentLocaleOptions = () => {
  return Object.values(MemeContentLocaleEnum).map((contentLocale) => {
    return {
      value: contentLocale,
      label: getContentLocaleLabel(contentLocale)
    }
  })
}

export const CONTENT_LOCALE_TO_LOCALE = {
  FR: 'fr',
  EN: 'en',
  UNIVERSAL: 'fr'
} as const satisfies Record<MemeContentLocale, Locale>

export const matchIsContentLocaleForeign = (
  contentLocale: MemeContentLocale,
  locale: Locale
): contentLocale is Exclude<MemeContentLocale, 'UNIVERSAL'> => {
  if (contentLocale === 'UNIVERSAL') {
    return false
  }

  return CONTENT_LOCALE_TO_LOCALE[contentLocale] !== locale
}

export const REQUIRED_TRANSLATION_LOCALES = {
  FR: ['fr'],
  EN: ['en'],
  UNIVERSAL: ['fr', 'en']
} as const satisfies Record<MemeContentLocale, readonly Locale[]>

export const getRequiredLocales = (
  contentLocale: MemeContentLocale
): readonly Locale[] => {
  return REQUIRED_TRANSLATION_LOCALES[contentLocale]
}

export const VISIBLE_CONTENT_LOCALES: Record<Locale, MemeContentLocale[]> = {
  fr: ['FR', 'EN', 'UNIVERSAL'],
  en: ['EN', 'UNIVERSAL']
}

export const FILTERABLE_CONTENT_LOCALES = [
  MemeContentLocaleEnum.FR,
  MemeContentLocaleEnum.EN
] as const satisfies readonly MemeContentLocale[]

export const DEFAULT_CONTENT_LOCALE_FILTER = {
  fr: [MemeContentLocaleEnum.FR, MemeContentLocaleEnum.EN],
  en: [MemeContentLocaleEnum.EN]
} as const satisfies Record<Locale, readonly MemeContentLocale[]>

export const matchIsDefaultContentLocaleFilter = (
  contentLocales: MemeContentLocale[],
  locale: Locale
): boolean => {
  const defaults = DEFAULT_CONTENT_LOCALE_FILTER[locale]

  return (
    contentLocales.length === defaults.length &&
    defaults.every((cl) => {
      return contentLocales.includes(cl)
    })
  )
}

export const parseContentLocalesParam = (
  param: string | undefined,
  locale: Locale
): MemeContentLocale[] => {
  if (!param) {
    return [...DEFAULT_CONTENT_LOCALE_FILTER[locale]]
  }

  return param.split(',').filter((value): value is MemeContentLocale => {
    return value in MemeContentLocaleEnum
  })
}

export const serializeContentLocalesParam = (
  contentLocales: MemeContentLocale[],
  locale: Locale
): string | undefined => {
  return matchIsDefaultContentLocaleFilter(contentLocales, locale)
    ? undefined
    : contentLocales.join(',')
}

export const contentLocalesWithUniversal = (
  contentLocales: MemeContentLocale[]
): MemeContentLocale[] => {
  return removeDuplicates([...contentLocales, MemeContentLocaleEnum.UNIVERSAL])
}

export const resolveVisibleContentLocales = (
  locale: Locale,
  contentLocales: MemeContentLocale[] | undefined
): MemeContentLocale[] => {
  if (!contentLocales) {
    return VISIBLE_CONTENT_LOCALES[locale]
  }

  return contentLocalesWithUniversal(contentLocales)
}

export const CONTENT_LOCALE_TO_SITE_LOCALES = Object.fromEntries(
  Object.values(MemeContentLocaleEnum).map((contentLocale) => {
    return [
      contentLocale,
      locales.filter((locale) => {
        return VISIBLE_CONTENT_LOCALES[locale].includes(contentLocale)
      })
    ]
  })
) as Record<MemeContentLocale, Locale[]>

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
  translations: (Pick<
    MemeTranslationModel,
    'locale' | 'title' | 'description'
  > &
    Partial<Pick<MemeTranslationModel, 'keywords'>>)[]
  contentLocale: MemeContentLocale
  requestedLocale: Locale
  fallback: Pick<MemeTranslationModel, 'title' | 'description'> &
    Partial<Pick<MemeTranslationModel, 'keywords'>>
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
    keywords: match?.keywords ?? fallback.keywords ?? []
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
