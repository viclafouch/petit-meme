import type {
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
import {
  buildIframeVideoUrl,
  buildVideoImageUrl,
  buildVideoOriginalUrl
} from '@/lib/bunny'
import type { AnyRouteMatch } from '@tanstack/react-router'

export const appProdUrl = 'https://petit-meme.io'

export const websiteOrigin =
  process.env.NODE_ENV === 'production' ? appProdUrl : 'http://localhost:3000'
const websiteId = `${websiteOrigin}/#website`

export const buildUrl = (pathname: string) => {
  let url = websiteOrigin

  try {
    url = new URL(pathname, websiteOrigin).href
  } catch (error) {}

  return url
}

export const seo = ({
  title,
  description,
  keywords,
  image,
  isAdmin = false,
  pathname = '/'
}: {
  title: string
  description?: string
  image?: string
  keywords?: string
  isAdmin?: boolean
  pathname?: string
}) => {
  const titlePrefixed = isAdmin
    ? `Admin Petit Meme - ${title}`
    : `Petit Meme - ${title}`

  let url = websiteOrigin

  try {
    url = new URL(pathname, websiteOrigin).href
  } catch (error) {}

  const tags = [
    { title: titlePrefixed },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'author', content: 'Victor de la Fouchardière' },
    { name: 'twitter:title', content: titlePrefixed },
    { name: 'twitter:description', content: description },
    { name: 'twitter:creator', content: '@TrustedSheriff' },
    { name: 'twitter:site', content: '@TrustedSheriff' },
    { name: 'og:type', content: 'website' },
    { name: 'og:site_name', content: titlePrefixed },
    { name: 'og:title', content: titlePrefixed },
    { name: 'og:description', content: description },
    { name: 'og:url', content: url },
    { name: 'og:locale', content: 'fr_FR' },
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'og:image', content: image }
        ]
      : [])
  ] satisfies AnyRouteMatch['meta']

  return tags
}

const buildDescription = (meme: MemeWithVideo & MemeWithCategories) => {
  if (meme.description) {
    return meme.description
  }

  return `Découvrez, téléchargez et partagez ce mème de "${meme.title}" avec tous vos proches. Télécharger le mème vidéo gratuitement.`
}

export const buildMemeSeo = (
  meme: MemeWithVideo & MemeWithCategories,
  overrideOptions: Partial<Parameters<typeof seo>[0]> = {}
) => {
  const categoryKeywords = meme.categories.flatMap((category) => {
    return category.category.keywords
  })

  const description = buildDescription(meme)

  return seo({
    title: meme.title,
    keywords: [...meme.keywords, ...categoryKeywords].join(', '),
    image: buildVideoImageUrl(meme.video.bunnyId),
    description,
    ...overrideOptions
  })
}

function formatSchemaDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return 'PT0S'
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  let duration = 'PT'

  if (hours > 0) {
    duration += `${hours}H`
  }

  if (minutes > 0) {
    duration += `${minutes}M`
  }

  if (seconds > 0 || duration === 'PT') {
    duration += `${seconds}S`
  }

  return duration
}

export const buildMemeJsonLd = (meme: MemeWithVideo, originalUrl: string) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: meme.title,
    '@id': `${websiteOrigin}/memes/${meme.id}#video`, // On utilise le même ID
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

// TODO: typing route
export const buildCategoryJsonLd = (
  category: CategoryModel | undefined,
  { page, memes }: { page: number; memes: MemeWithVideo[] }
): SchemaGraph => {
  const basePath = category ? `/memes/category/${category.slug}` : '/memes'
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
              url: `${websiteOrigin}/memes/${meme.id}`
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
        '@id': `${websiteOrigin}/#website`,
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
        isPartOf: { '@id': `${websiteOrigin}/#website` },
        about: { '@id': `${websiteOrigin}/#organization` },
        description:
          'Découvre Petit Meme, la plateforme où tu peux parcourir, créer et partager des mèmes gratuitement. Explore notre bibliothèque de vidéos et images humoristiques, sauvegarde tes favoris et amuse-toi avec des contenus toujours à jour.'
      } satisfies WebPage
    ]
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
        isPartOf: { '@id': `${websiteOrigin}/#website` }
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
              return plan.monthlyPriceInCents / 100
            })
          ).toFixed(2),
          highPrice: Math.max(
            ...plans.map((plan) => {
              return plan.monthlyPriceInCents / 100
            })
          ).toFixed(2),
          offers: plans.map((plan): Offer => {
            return {
              '@type': 'Offer',
              name: plan.title,
              description: plan.description,
              price: (plan.monthlyPriceInCents / 100).toFixed(2),
              priceCurrency: 'EUR',
              url: pricingUrl,
              availability: 'https://schema.org/InStock',
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: (plan.monthlyPriceInCents / 100).toFixed(2),
                priceCurrency: 'EUR',
                referenceQuantity: {
                  '@type': 'QuantitativeValue',
                  value: 1,
                  unitCode: 'MON' // Indique un cycle mensuel
                }
              } as PriceSpecification
            }
          })
        }
      } as Product
    ]
  }
}
