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

const CONTENT_LOCALE_LABELS = {
  FR: m.meme_content_locale_FR,
  EN: m.meme_content_locale_EN,
  UNIVERSAL: m.meme_content_locale_UNIVERSAL
} as const satisfies Record<MemeContentLocale, () => string>

export const getContentLocaleLabel = (
  contentLocale: MemeContentLocale
): string => {
  return CONTENT_LOCALE_LABELS[contentLocale]()
}

export const matchIsMemeContentLocale = (
  value: string
): value is MemeContentLocale => {
  return Object.values<string>(MemeContentLocaleEnum).includes(value)
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

  return param.split(',').filter(matchIsMemeContentLocale)
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

const findSiteLocalesShowing = (contentLocale: MemeContentLocale) => {
  return locales.filter((locale) => {
    return VISIBLE_CONTENT_LOCALES[locale].includes(contentLocale)
  })
}

export const CONTENT_LOCALE_TO_SITE_LOCALES = {
  FR: findSiteLocalesShowing(MemeContentLocaleEnum.FR),
  EN: findSiteLocalesShowing(MemeContentLocaleEnum.EN),
  UNIVERSAL: findSiteLocalesShowing(MemeContentLocaleEnum.UNIVERSAL)
} as const satisfies Record<MemeContentLocale, Locale[]>

export const buildLocaleRecord = <TValue>(
  factory: (locale: Locale) => TValue
): Record<Locale, TValue> => {
  return {
    fr: factory('fr'),
    en: factory('en')
  }
}

export const findTranslationByLocale = <
  TTranslation extends { locale: string }
>(
  translations: TTranslation[],
  locale: string
) => {
  return translations.find((translation) => {
    return translation.locale === locale
  })
}

const findTranslationWithPriority = <TTranslation extends { locale: string }>(
  translations: TTranslation[],
  localePriority: readonly string[]
): TTranslation | undefined => {
  for (const locale of localePriority) {
    const match = findTranslationByLocale(translations, locale)

    if (match !== undefined) {
      return match
    }
  }

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

type MemeWithTranslationsToResolve = {
  translations: Pick<MemeTranslationModel, 'locale' | 'title' | 'description'>[]
  contentLocale: MemeContentLocale
  title: string
  description: string
}

export const mapMemesWithResolvedTranslations = <
  TMeme extends MemeWithTranslationsToResolve
>(
  memes: TMeme[],
  locale: Locale
) => {
  return memes.map(({ translations, ...meme }) => {
    const resolved = resolveMemeTranslation({
      translations,
      contentLocale: meme.contentLocale,
      requestedLocale: locale,
      fallback: meme
    })

    return {
      ...meme,
      title: resolved.title,
      description: resolved.description,
      keywords: resolved.keywords
    }
  })
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
