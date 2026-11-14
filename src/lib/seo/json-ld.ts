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
  WebApplication,
  WebPage,
  WebSite,
  WithActionConstraints,
  InteractionCounter,
  WithContext
} from 'schema-dts'
import { LOGO_PATH, SITE_NAME } from '~/constants/branding'
import { HLS_MIME_TYPE } from '~/constants/bunny'
import type { FaqItem } from '~/constants/faq'
import type { MemeWithVideo } from '~/constants/meme'
import type { Plan } from '~/constants/plan'
import { ONE_HOUR_IN_SECONDS, SECONDS_PER_MINUTE } from '~/constants/time'
import type { CategoryModel } from '~/db/generated/prisma/models'
import { convertCentsToEuros } from '~/helpers/number'
import { buildScreenshotPath } from '~/helpers/web-app-assets'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import {
  buildEmbedUrl,
  buildMemeUrl,
  buildUrl,
  websiteOrigin
} from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

const websiteId = `${websiteOrigin}/#website`

const websiteSearchAction = {
  '@type': 'SearchAction',
  target: {
    '@type': 'EntryPoint',
    urlTemplate: `${websiteOrigin}/memes?query={search_term_string}`
  },
  'query-input': 'required name=search_term_string'
} satisfies WithActionConstraints<SearchAction>

const buildWatchCounter = (viewCount: number) => {
  return {
    '@type': 'InteractionCounter',
    interactionType: { '@type': 'WatchAction' },
    userInteractionCount: viewCount
  } satisfies InteractionCounter
}

const formatSchemaDuration = (totalSeconds: number) => {
  if (totalSeconds <= 0) {
    return 'PT0S'
  }

  const hours = Math.floor(totalSeconds / ONE_HOUR_IN_SECONDS)
  const minutes = Math.floor(
    (totalSeconds % ONE_HOUR_IN_SECONDS) / SECONDS_PER_MINUTE
  )
  const seconds = totalSeconds % SECONDS_PER_MINUTE

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
  crawlerStreamUrl: string | null
): SchemaGraph => {
  const memeUrl = buildMemeUrl(meme.id)
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
        embedUrl: buildEmbedUrl(meme.id),
        duration: formatSchemaDuration(meme.video.duration),
        requiresSubscription: false,
        videoQuality: 'HD',
        keywords: meme.keywords.join(', '),
        ...(crawlerStreamUrl === null
          ? {}
          : { contentUrl: crawlerStreamUrl, encodingFormat: HLS_MIME_TYPE }),
        interactionStatistic: buildWatchCounter(meme.viewCount)
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
              '@id': `${buildMemeUrl(meme.id)}#video`,
              name: meme.title,
              description: meme.description,
              embedUrl: buildEmbedUrl(meme.id),
              thumbnailUrl: buildVideoImageUrl(meme.video.bunnyId),
              uploadDate: meme.publishedAt?.toISOString(),
              url: buildMemeUrl(meme.id),
              interactionStatistic: buildWatchCounter(meme.viewCount)
            } satisfies VideoObject
          }
        })
      } satisfies ItemList
    ]
  }
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
        name: SITE_NAME,
        publisher: { '@id': `${websiteOrigin}/#organization` },
        potentialAction: websiteSearchAction
      } satisfies WebSite,
      {
        '@type': 'Organization',
        '@id': `${websiteOrigin}/#organization`,
        name: SITE_NAME,
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

export const buildWebApplicationJsonLd = (): WithContext<WebApplication> => {
  const locale = getLocale()
  const appUrl = buildUrl('/app', locale)

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${appUrl}#webapplication`,
    name: SITE_NAME,
    url: appUrl,
    description: m.app_page_description(),
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Android, iOS, Windows, macOS, ChromeOS',
    browserRequirements: 'Requires a modern web browser',
    image: `${websiteOrigin}/android-chrome-512x512.png`,
    screenshot: `${websiteOrigin}${buildScreenshotPath({ locale, formFactor: 'narrow', name: 'home' })}`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR'
    },
    publisher: { '@id': `${websiteOrigin}/#organization` }
  }
}
