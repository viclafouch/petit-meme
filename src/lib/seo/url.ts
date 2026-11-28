import type { ThumbnailRatio } from '~/constants/og'
import { clientEnv } from '~/env/client'
import {
  baseLocale,
  getLocale,
  localizeUrl,
  type Locale
} from '~/paraglide/runtime'

export const websiteOrigin = clientEnv.VITE_SITE_URL

const OG_VERSION = 5

export const OG_DEFAULTED_TYPE_VALUES = [
  'ai-search',
  'app',
  'faq',
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

const buildOgEndpointUrl = (params: Record<string, string | undefined>) => {
  const url = new URL('/api/og', websiteOrigin)

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  return url.href
}

export const buildOgImage = (
  { type, locale, title, subtitle }: BuildOgImageUrlParams,
  alt: string
) => {
  return {
    url: buildOgEndpointUrl({
      type,
      locale,
      title,
      subtitle,
      v: String(OG_VERSION)
    }),
    alt,
    type: 'image/png'
  } as const
}

export const buildMemeOgImageUrl = (memeId: string) => {
  return buildOgEndpointUrl({ type: 'meme', id: memeId, v: String(OG_VERSION) })
}

export const buildThumbnailUrl = (memeId: string, ratio: ThumbnailRatio) => {
  return buildOgEndpointUrl({ type: 'thumbnail', id: memeId, ratio })
}

export const buildOembedUrl = (pageUrl: string) => {
  const url = new URL('/api/oembed', websiteOrigin)
  url.searchParams.set('url', pageUrl)
  url.searchParams.set('format', 'json')

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
