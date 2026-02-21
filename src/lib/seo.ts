import type {
  BreadcrumbList,
  CollectionPage,
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
import type { AnyRouteMatch } from '@tanstack/react-router'

export const websiteOrigin = clientEnv.VITE_SITE_URL
const websiteId = `${websiteOrigin}/#website`

export const buildUrl = (pathname: string) => {
  try {
    return new URL(pathname, websiteOrigin).href
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
  pathname = '/'
}: SeoParams): SeoResult => {
  const titlePrefixed = isAdmin
    ? `Admin Petit Meme - ${title}`
    : `Petit Meme - ${title}`

  const url = buildUrl(pathname)

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
    { property: 'og:url', content: url },
    { property: 'og:locale', content: 'fr_FR' },
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { name: 'twitter:card', content: 'summary_large_image' },
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
        { rel: 'canonical', href: url },
        { rel: 'alternate', hrefLang: 'fr', href: url }
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

export const buildHomeJsonLd = (): SchemaGraph => {
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
      } satisfies WebPage
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

export const buildPricingJsonLd = (plans: Plan[]): SchemaGraph => {
  const pricingUrl = `${websiteOrigin}/pricing`
  const title = 'Plans et Tarifs'
  const description =
    'Découvre les plans de Petit Meme : gratuit ou Premium avec accès illimité aux mèmes, favoris et générations de vidéos. Choisis le plan qui te permet de créer et partager des mèmes sans limites !'

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
      } as WebPage,
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
          lowPrice: Math.min(
            ...plans.map((plan) => {
              return convertCentsToEuros(plan.monthlyPriceInCents)
            })
          ).toFixed(2),
          highPrice: Math.max(
            ...plans.map((plan) => {
              return convertCentsToEuros(plan.monthlyPriceInCents)
            })
          ).toFixed(2),
          offers: plans.map((plan): Offer => {
            return {
              '@type': 'Offer',
              name: plan.title,
              description: plan.description,
              price: convertCentsToEuros(plan.monthlyPriceInCents).toFixed(2),
              priceCurrency: 'EUR',
              url: pricingUrl,
              availability: 'https://schema.org/InStock',
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: convertCentsToEuros(plan.monthlyPriceInCents).toFixed(2),
                priceCurrency: 'EUR',
                referenceQuantity: {
                  '@type': 'QuantitativeValue',
                  value: 1,
                  unitCode: 'MON'
                }
              } as PriceSpecification
            }
          })
        }
      } as Product
    ]
  }
}
