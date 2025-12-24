import type {
  CollectionPage,
  Graph,
  ItemList,
  ListItem,
  VideoObject,
  WithContext
} from 'schema-dts'
import type { MemeWithCategories, MemeWithVideo } from '@/constants/meme'
import type { CategoryModel } from '@/db/generated/prisma/models'
import { buildIframeVideoImageUrl, buildVideoImageUrl } from '@/lib/bunny'
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
    title: `Meme de ${meme.title}`,
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
    embedUrl: buildIframeVideoImageUrl(meme.video.bunnyId),
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
      } as CollectionPage,
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
              url: `${websiteOrigin}/memes/${meme.id}`
            } satisfies VideoObject
          }
        })
      } satisfies ItemList
    ]
  }
}
