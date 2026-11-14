import { clientEnv } from '~/env/client'
import {
  baseLocale,
  getLocale,
  localizeUrl,
  type Locale
} from '~/paraglide/runtime'

export const websiteOrigin = clientEnv.VITE_SITE_URL

const OG_VERSION = 3

export const OG_DEFAULTED_TYPE_VALUES = [
  'ai-search',
  'app',
  'pricing',
  'reels',
  'submit'
] as const satisfies readonly string[]

export const OG_TITLED_TYPE_VALUES = [
  'category',
  'legal'
] as const satisfies readonly string[]

export type OgDefaultedType = (typeof OG_DEFAULTED_TYPE_VALUES)[number]
type OgTitledType = (typeof OG_TITLED_TYPE_VALUES)[number]

type BuildOgImageUrlParams = {
  subtitle?: string
  locale: Locale
} & (
  | { type: 'home'; title?: never }
  | { type: OgDefaultedType; title?: string }
  | { type: OgTitledType; title: string }
)

export const buildOgImageUrl = ({
  type,
  title,
  subtitle,
  locale
}: BuildOgImageUrlParams): string => {
  const url = new URL('/api/og', websiteOrigin)
  url.searchParams.set('type', type)
  url.searchParams.set('locale', locale)
  url.searchParams.set('v', String(OG_VERSION))

  if (title) {
    url.searchParams.set('title', title)
  }

  if (subtitle) {
    url.searchParams.set('subtitle', subtitle)
  }

  return url.href
}

export const buildEmbedUrl = (memeId: string, locale: Locale = getLocale()) => {
  return buildUrl(`/embed/${memeId}`, locale)
}

export const buildUrl = (pathname: string, locale?: Locale): string => {
  try {
    const baseUrl = new URL(pathname, websiteOrigin).href

    if (locale === undefined || locale === baseLocale) {
      return baseUrl
    }

    const localized = localizeUrl(baseUrl, { locale })

    return localized instanceof URL ? localized.href : localized
  } catch {
    return websiteOrigin
  }
}

export const buildMemeUrl = (memeId: string) => {
  return `${websiteOrigin}/memes/${memeId}`
}
