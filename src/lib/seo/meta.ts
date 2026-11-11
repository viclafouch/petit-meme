import type { AnyRouteMatch } from '@tanstack/react-router'
import { SITE_NAME } from '~/constants/branding'
import type { MemeWithCategories, MemeWithVideo } from '~/constants/meme'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~/constants/og'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { buildEmbedUrl, buildUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages.js'
import {
  baseLocale,
  getLocale,
  locales,
  type Locale
} from '~/paraglide/runtime'

const OG_LOCALE_MAP = {
  fr: 'fr_FR',
  en: 'en_US'
} as const satisfies Record<Locale, string>

const ADMIN_SITE_NAME = `Admin ${SITE_NAME}`

const buildPageTitle = (title: string, siteName = SITE_NAME) => {
  return `${siteName} - ${title}`
}

type SeoParams = {
  title: string
  description?: string
  image?: string
  imageAlt?: string
  imageType?: 'image/png' | 'image/jpeg'
  keywords?: string
  isAdmin?: boolean
  pathname?: string
  noindex?: boolean
  canonicalPathname?: string
  ogType?: 'website' | 'video.other'
}

type SeoResult = {
  meta: NonNullable<AnyRouteMatch['meta']>
  links: NonNullable<AnyRouteMatch['links']>
}

export const buildSeo = ({
  title,
  description,
  keywords,
  image,
  imageAlt,
  imageType = 'image/png',
  isAdmin = false,
  pathname = '/',
  noindex = false,
  canonicalPathname,
  ogType = 'website'
}: SeoParams): SeoResult => {
  const locale = getLocale()
  const titlePrefixed = isAdmin
    ? buildPageTitle(title, ADMIN_SITE_NAME)
    : buildPageTitle(title)

  const canonicalBase = canonicalPathname ?? pathname
  const canonicalUrl = buildUrl(canonicalBase, locale)
  const alternateLocales = locales.filter((loc) => {
    return loc !== locale
  })

  const meta = [
    { title: titlePrefixed },
    ...(keywords ? [{ name: 'keywords', content: keywords }] : []),
    { name: 'author', content: 'Victor de la Fouchardière' },
    { name: 'twitter:title', content: titlePrefixed },
    { name: 'twitter:creator', content: '@TrustedSheriff' },
    { name: 'twitter:site', content: '@TrustedSheriff' },
    { property: 'og:type', content: ogType },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: titlePrefixed },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:locale', content: OG_LOCALE_MAP[locale] },
    ...alternateLocales.map((alternateLocale) => {
      return {
        property: 'og:locale:alternate',
        content: OG_LOCALE_MAP[alternateLocale]
      }
    }),
    ...(description
      ? [
          { name: 'description', content: description },
          { name: 'twitter:description', content: description },
          { property: 'og:description', content: description }
        ]
      : []),
    ...(noindex ? [{ name: 'robots', content: 'noindex, follow' }] : []),
    {
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary'
    },
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
          { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
          { property: 'og:image:type', content: imageType },
          ...(imageAlt
            ? [
                { name: 'twitter:image:alt', content: imageAlt },
                { property: 'og:image:alt', content: imageAlt }
              ]
            : [])
        ]
      : [])
  ] satisfies AnyRouteMatch['meta']

  const links: NonNullable<AnyRouteMatch['links']> = isAdmin
    ? []
    : [
        { rel: 'canonical', href: canonicalUrl },
        ...locales.map((hreflangLocale) => {
          return {
            rel: 'alternate',
            hrefLang: hreflangLocale,
            href: buildUrl(canonicalBase, hreflangLocale)
          }
        }),
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: buildUrl(canonicalBase, baseLocale)
        }
      ]

  return { meta, links }
}

const buildDescription = (meme: MemeWithVideo & MemeWithCategories) => {
  if (meme.description !== '') {
    return meme.description
  }

  return m.seo_meme_fallback_description({ title: meme.title })
}

export const buildMemeSeo = (
  meme: MemeWithVideo & MemeWithCategories,
  overrideOptions: Partial<Omit<SeoParams, 'ogType'>> = {}
): SeoResult => {
  const categoryKeywords = meme.categories.flatMap((category) => {
    return category.category.keywords
  })

  const description = buildDescription(meme)
  const embedUrl = buildEmbedUrl(meme.id)

  const result = buildSeo({
    title: meme.title,
    keywords: [...meme.keywords, ...categoryKeywords].join(', '),
    image: buildVideoImageUrl(meme.video.bunnyId),
    imageAlt: m.seo_meme_image_alt({ title: meme.title }),
    imageType: 'image/jpeg',
    description,
    ogType: 'video.other',
    ...overrideOptions
  })

  return {
    ...result,
    meta: [
      ...result.meta,
      { property: 'og:video', content: embedUrl },
      { property: 'og:video:secure_url', content: embedUrl },
      { property: 'og:video:type', content: 'text/html' },
      { property: 'og:video:width', content: '1280' },
      { property: 'og:video:height', content: '720' }
    ]
  }
}
