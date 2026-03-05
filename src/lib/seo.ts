import type {
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  Graph,
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
  canonicalPathname
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
    { property: 'og:type', content: 'website' },
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

  return `Découvrez, téléchargez et partagez ce mème de "${meme.title}" avec tous vos proches. Télécharger le mème vidéo gratuitement.`
}

export const buildMemeSeo = (
  meme: MemeWithVideo & MemeWithCategories,
  overrideOptions: Partial<SeoParams> = {}
): SeoResult => {
  const categoryKeywords = meme.categories.flatMap((category) => {
    return category.category.keywords
  })

  const description = buildDescription(meme)

  return seo({
    title: meme.title,
    keywords: [...meme.keywords, ...categoryKeywords].join(', '),
    image: buildVideoImageUrl(meme.video.bunnyId),
    imageAlt: `Mème vidéo : ${meme.title}`,
    description,
    ...overrideOptions
  })
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

export const buildMemeJsonLd = (meme: MemeWithVideo, originalUrl: string) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: meme.title,
    '@id': `${websiteOrigin}/memes/${meme.id}#video`,
    description: meme.description,
    thumbnailUrl: buildVideoImageUrl(meme.video.bunnyId),
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
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '85'
    }
  } satisfies WithContext<VideoObject>
}

type SchemaGraph = Graph & { '@context': 'https://schema.org' }

export const buildCategoryJsonLd = (
  category: Pick<CategoryModel, 'slug' | 'title'> | undefined,
  { page, memes }: { page: number; memes: MemeWithVideo[] }
): SchemaGraph => {
  const basePath = category
    ? `/memes/category/${category.slug}`
    : '/memes/category/all'
  const categoryUrl = `${websiteOrigin}${basePath}${page > 1 ? `?page=${page}` : ''}`
  const title = category ? category.title : 'Tous les mèmes'
  const description = category
    ? `Découvrez la page ${page} des meilleurs mèmes vidéo de la catégorie ${title}.`
    : `Découvrez la page ${page} de notre collection complète de mèmes vidéo.`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${categoryUrl}#webpage`,
        url: categoryUrl,
        name: `${title} - Page ${page}`,
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
        logo: `${websiteOrigin}/images/logo.png`,
        description:
          'Découvre Petit Meme, la plateforme où tu peux parcourir, créer et partager des mèmes gratuitement. Explore notre bibliothèque de vidéos et images humoristiques, sauvegarde tes favoris et amuse-toi avec des contenus toujours à jour.'
      } satisfies Organization,
      {
        '@type': 'WebPage',
        '@id': `${websiteOrigin}/#webpage`,
        url: websiteOrigin,
        name: 'Petit Meme - Les meilleurs mèmes vidéo',
        isPartOf: { '@id': websiteId },
        about: { '@id': `${websiteOrigin}/#organization` },
        description:
          'Découvre Petit Meme, la plateforme où tu peux parcourir, créer et partager des mèmes gratuitement. Explore notre bibliothèque de vidéos et images humoristiques, sauvegarde tes favoris et amuse-toi avec des contenus toujours à jour.'
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
  const title = 'Plans et Tarifs'
  const description =
    'Découvre les plans de Petit Meme : gratuit ou Premium avec accès illimité aux mèmes, favoris et générations de vidéos. Choisis le plan qui te permet de créer et partager des mèmes sans limites !'

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
        name: 'Abonnement Petit Meme',
        image: `${websiteOrigin}/images/logo.png`,
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
              nameSuffix: ' (Annuel)',
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
