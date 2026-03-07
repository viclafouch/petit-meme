import type {
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  Graph,
  ImageObject,
  ItemList,
  ListItem,
  Offer,
  Organization,
  PriceSpecification,
  Product,
  SearchAction,
  VideoObject,
  WebPage,
  WebSite,
  WithContext
} from 'schema-dts'
import type { FaqItem } from '@/components/faq-section'
import { LOGO_PATH } from '@/constants/branding'
import type { MemeWithCategories, MemeWithVideo } from '@/constants/meme'
import type { Plan } from '@/constants/plan'
import type { CategoryModel } from '@/db/generated/prisma/models'
import { clientEnv } from '@/env/client'
import { convertCentsToEuros } from '@/helpers/number'
import {
  buildIframeVideoUrl,
  buildVideoImageUrl,
  buildVideoOriginalUrl
} from '@/lib/bunny'
import { m } from '@/paraglide/messages.js'
import type { Locale } from '@/paraglide/runtime'
import {
  baseLocale,
  getLocale,
  locales,
  localizeUrl
} from '@/paraglide/runtime'
import type { AnyRouteMatch } from '@tanstack/react-router'

export const websiteOrigin = clientEnv.VITE_SITE_URL
const websiteId = `${websiteOrigin}/#website`

const OG_LOCALE_MAP = {
  fr: 'fr_FR',
  en: 'en_US'
} as const satisfies Record<Locale, string>

export const buildUrl = (pathname: string, locale?: Locale): string => {
  try {
    const baseUrl = new URL(pathname, websiteOrigin).href

    if (!locale || locale === baseLocale) {
      return baseUrl
    }

    const localized = localizeUrl(baseUrl, { locale })

    return localized instanceof URL ? localized.href : localized
  } catch {
    return websiteOrigin
  }
}

type SeoParams = {
  title: string
  description?: string
  image?: string
  imageAlt?: string
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

export const seo = ({
  title,
  description,
  keywords,
  image,
  imageAlt,
  isAdmin = false,
  pathname = '/',
  noindex = false,
  canonicalPathname,
  ogType = 'website'
}: SeoParams): SeoResult => {
  const locale = getLocale()
  const titlePrefixed = isAdmin
    ? `Admin Petit Meme - ${title}`
    : `Petit Meme - ${title}`

  const canonicalBase = canonicalPathname ?? pathname
  const canonicalUrl = buildUrl(canonicalBase, locale)
  const alternateLocales = locales.filter((loc) => {
    return loc !== locale
  })

  const meta = [
    { title: titlePrefixed },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'author', content: 'Victor de la Fouchardière' },
    { name: 'twitter:title', content: titlePrefixed },
    { name: 'twitter:description', content: description },
    { name: 'twitter:creator', content: '@TrustedSheriff' },
    { name: 'twitter:site', content: '@TrustedSheriff' },
    { property: 'og:type', content: ogType },
    { property: 'og:site_name', content: 'Petit Meme' },
    { property: 'og:title', content: titlePrefixed },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:locale', content: OG_LOCALE_MAP[locale] },
    ...alternateLocales.map((alternateLocale) => {
      return {
        property: 'og:locale:alternate',
        content: OG_LOCALE_MAP[alternateLocale]
      }
    }),
    ...(noindex ? [{ name: 'robots', content: 'noindex, follow' }] : []),
    {
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary'
    },
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
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
  if (meme.description) {
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
  const embedUrl = buildIframeVideoUrl(meme.video.bunnyId)

  const result = seo({
    title: meme.title,
    keywords: [...meme.keywords, ...categoryKeywords].join(', '),
    image: buildVideoImageUrl(meme.video.bunnyId),
    imageAlt: m.seo_meme_image_alt({ title: meme.title }),
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

const formatSchemaDuration = (totalSeconds: number) => {
  if (totalSeconds <= 0) {
    return 'PT0S'
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts = [
    hours > 0 ? `${hours}H` : '',
    minutes > 0 ? `${minutes}M` : '',
    seconds > 0 || (hours === 0 && minutes === 0) ? `${seconds}S` : ''
  ]

  return `PT${parts.join('')}`
}

type SchemaGraph = Graph & { '@context': 'https://schema.org' }

export const buildMemeJsonLd = (
  meme: MemeWithVideo,
  originalUrl: string
): SchemaGraph => {
  const memeUrl = `${websiteOrigin}/memes/${meme.id}`
  const thumbnailUrl = buildVideoImageUrl(meme.video.bunnyId)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${memeUrl}#webpage`,
        url: memeUrl,
        isPartOf: { '@id': websiteId },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          contentUrl: thumbnailUrl
        } satisfies ImageObject,
        mainEntity: { '@id': `${memeUrl}#video` }
      } satisfies WebPage,
      {
        '@type': 'VideoObject',
        '@id': `${memeUrl}#video`,
        name: meme.title,
        description: meme.description,
        thumbnailUrl,
        uploadDate: meme.createdAt.toISOString(),
        embedUrl: buildIframeVideoUrl(meme.video.bunnyId),
        duration: formatSchemaDuration(meme.video.duration),
        requiresSubscription: false,
        videoQuality: 'HD',
        keywords: meme.keywords.join(', '),
        contentUrl: originalUrl,
        encodingFormat: 'video/mp4',
        interactionStatistic: {
          '@type': 'InteractionCounter',
          interactionType: { '@type': 'WatchAction' },
          userInteractionCount: meme.viewCount
        }
      } satisfies VideoObject
    ]
  }
}

export const buildCategoryJsonLd = (
  category: Pick<CategoryModel, 'slug' | 'title'> | undefined,
  { page, memes }: { page: number; memes: MemeWithVideo[] }
): SchemaGraph => {
  const basePath = category
    ? `/memes/category/${category.slug}`
    : '/memes/category/all'
  const categoryUrl = `${websiteOrigin}${basePath}${page > 1 ? `?page=${page}` : ''}`
  const title = category ? category.title : m.meme_all_memes()
  const description = category
    ? m.seo_category_page_description({ page: String(page), title })
    : m.seo_category_all_description({ page: String(page) })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${categoryUrl}#webpage`,
        url: categoryUrl,
        name: m.seo_category_page_name({ title, page: String(page) }),
        description,
        isPartOf: { '@id': websiteId },
        mainEntity: { '@id': `${categoryUrl}#itemlist` }
      } satisfies CollectionPage,
      {
        '@type': 'ItemList',
        '@id': `${categoryUrl}#itemlist`,
        numberOfItems: memes.length,
        itemListElement: memes.map((meme, index): ListItem => {
          return {
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'VideoObject',
              '@id': `${websiteOrigin}/memes/${meme.id}#video`,
              name: meme.title,
              description: meme.description,
              contentUrl: buildVideoOriginalUrl(meme.video.bunnyId),
              embedUrl: buildIframeVideoUrl(meme.video.bunnyId),
              thumbnailUrl: buildVideoImageUrl(meme.video.bunnyId),
              uploadDate: meme.publishedAt?.toISOString(),
              url: `${websiteOrigin}/memes/${meme.id}`,
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: { '@type': 'WatchAction' },
                userInteractionCount: meme.viewCount
              }
            } satisfies VideoObject
          }
        })
      } satisfies ItemList
    ]
  }
}

type QueryAction = SearchAction & {
  'query-input': string
}

type BuildFaqPageJsonLdParams = {
  faqItems: readonly FaqItem[]
  pageUrl: string
}

const buildFaqPageJsonLd = ({
  faqItems,
  pageUrl
}: BuildFaqPageJsonLdParams): FAQPage => {
  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faqItems.map((item) => {
      return {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }
    })
  } satisfies FAQPage
}

type BuildHomeJsonLdParams = {
  faqItems: readonly FaqItem[]
}

export const buildHomeJsonLd = ({
  faqItems
}: BuildHomeJsonLdParams): SchemaGraph => {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: websiteOrigin,
        name: 'Petit Meme',
        publisher: { '@id': `${websiteOrigin}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${websiteOrigin}/memes?query={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        } as QueryAction
      } satisfies WebSite,
      {
        '@type': 'Organization',
        '@id': `${websiteOrigin}/#organization`,
        name: 'Petit Meme',
        url: websiteOrigin,
        logo: `${websiteOrigin}${LOGO_PATH}`,
        description: m.seo_home_description()
      } satisfies Organization,
      {
        '@type': 'WebPage',
        '@id': `${websiteOrigin}/#webpage`,
        url: websiteOrigin,
        name: m.seo_home_page_name(),
        isPartOf: { '@id': websiteId },
        about: { '@id': `${websiteOrigin}/#organization` },
        description: m.seo_home_description()
      } satisfies WebPage,
      buildFaqPageJsonLd({ faqItems, pageUrl: websiteOrigin })
    ]
  }
}

type BreadcrumbItem = {
  name: string
  pathname: string
}

export const buildBreadcrumbJsonLd = (
  items: readonly BreadcrumbItem[]
): WithContext<BreadcrumbList> => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index): ListItem => {
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: buildUrl(item.pathname)
      }
    })
  }
}

type BuildPlanOfferParams = {
  plan: Plan
  priceInCents: number
  nameSuffix: string
  unitCode: string
  offerUrl: string
}

const buildPlanOffer = ({
  plan,
  priceInCents,
  nameSuffix,
  unitCode,
  offerUrl
}: BuildPlanOfferParams): Offer => {
  const priceEuros = convertCentsToEuros(priceInCents).toFixed(2)

  return {
    '@type': 'Offer',
    name: `${plan.title}${nameSuffix}`,
    description: plan.description,
    price: priceEuros,
    priceCurrency: 'EUR',
    url: offerUrl,
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: priceEuros,
      priceCurrency: 'EUR',
      referenceQuantity: {
        '@type': 'QuantitativeValue',
        value: 1,
        unitCode
      }
    } satisfies PriceSpecification
  }
}

type BuildPricingJsonLdParams = {
  plans: Plan[]
  faqItems: readonly FaqItem[]
}

export const buildPricingJsonLd = ({
  plans,
  faqItems
}: BuildPricingJsonLdParams): SchemaGraph => {
  const pricingUrl = `${websiteOrigin}/pricing`
  const title = m.seo_pricing_title()
  const description = m.seo_pricing_description()

  const monthlyPrices = plans.map((plan) => {
    return convertCentsToEuros(plan.pricing.monthly.priceInCents)
  })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pricingUrl}#webpage`,
        url: pricingUrl,
        name: title,
        description,
        isPartOf: { '@id': websiteId }
      } satisfies WebPage,
      {
        '@type': 'Product',
        '@id': `${pricingUrl}#product`,
        name: m.seo_pricing_subscription_name(),
        image: `${websiteOrigin}${LOGO_PATH}`,
        description,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'EUR',
          offerCount: plans.length,
          lowPrice: Math.min(...monthlyPrices).toFixed(2),
          highPrice: Math.max(...monthlyPrices).toFixed(2),
          offers: plans.flatMap((plan): Offer[] => {
            const monthlyOffer = buildPlanOffer({
              plan,
              priceInCents: plan.pricing.monthly.priceInCents,
              nameSuffix: '',
              unitCode: 'MON',
              offerUrl: pricingUrl
            })

            const hasAnnualPrice = plan.pricing.yearly.priceInCents > 0

            if (!hasAnnualPrice) {
              return [monthlyOffer]
            }

            const annualOffer = buildPlanOffer({
              plan,
              priceInCents: plan.pricing.yearly.priceInCents,
              nameSuffix: m.seo_pricing_annual_suffix(),
              unitCode: 'ANN',
              offerUrl: pricingUrl
            })

            return [monthlyOffer, annualOffer]
          })
        }
      } satisfies Product,
      buildFaqPageJsonLd({ faqItems, pageUrl: pricingUrl })
    ]
  }
}
