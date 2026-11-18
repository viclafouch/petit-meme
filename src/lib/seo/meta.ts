import type { AnyRouteMatch } from '@tanstack/react-router'
import { SITE_NAME } from '~/constants/branding'
import type { MemeWithCategories, MemeWithVideo } from '~/constants/meme'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~/constants/og'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { buildMemeOgImageUrl, buildOembedUrl, buildUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
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

export const buildPageTitle = (title: string, siteName = SITE_NAME) => {
  return `${siteName} - ${title}`
}

type SeoImage = {
  url: string
  alt: string
  type: 'image/png' | 'image/jpeg'
}

type SeoParams = {
  title: string
  description?: string
  image?: SeoImage
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
    { name: 'twitter:title', content: title },
    { name: 'twitter:creator', content: '@TrustedSheriff' },
    { name: 'twitter:site', content: '@TrustedSheriff' },
    { property: 'og:type', content: ogType },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
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
          { name: 'twitter:image', content: image.url },
          { name: 'twitter:image:alt', content: image.alt },
          { property: 'og:image', content: image.url },
          { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
          { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
          { property: 'og:image:type', content: image.type },
          { property: 'og:image:alt', content: image.alt }
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
  const isPublished = meme.status === MemeStatus.PUBLISHED

  const result = buildSeo({
    title: meme.title,
    keywords: [...meme.keywords, ...categoryKeywords].join(', '),
    image: isPublished
      ? {
          url: buildMemeOgImageUrl(meme.id),
          alt: m.seo_meme_image_alt({ title: meme.title }),
          type: 'image/jpeg'
        }
      : undefined,
    description: buildDescription(meme),
    ogType: 'video.other',
    ...overrideOptions
  })

  if (!isPublished || overrideOptions.isAdmin) {
    return result
  }

  return {
    ...result,
    links: [
      ...result.links,
      {
        rel: 'alternate',
        type: 'application/json+oembed',
        href: buildOembedUrl(buildUrl(`/memes/${meme.id}`, getLocale())),
        title: meme.title
      }
    ]
  }
}
