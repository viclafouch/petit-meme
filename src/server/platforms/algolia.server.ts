import { insightsClient } from '@algolia/client-insights'
import { searchClient } from '@algolia/client-search'
import { recommendClient } from '@algolia/recommend'
import * as Sentry from '@sentry/tanstackstart-react'
import { getCookie } from '@tanstack/react-start/server'
import {
  ALGOLIA_FAIL_FAST_ON_RATE_LIMIT,
  ALGOLIA_WAIT_ON_RATE_LIMIT
} from '~/constants/algolia'
import { COOKIE_ALGOLIA_USER_TOKEN_KEY } from '~/constants/cookie'
import { type MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server.server'
import { contentLocalesWithUniversal } from '~/helpers/i18n-content'
import { matchIsAnalyticsConsentGiven } from '~/lib/cookie-consent'
import { algoliaLogger } from '~/lib/logger'
import type { Locale } from '~/paraglide/runtime'

export const getAlgoliaIndexPrefix = () => {
  return serverEnv.VITE_ALGOLIA_INDEX
}

export const resolveAlgoliaIndexName = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}`
}

export const resolveAlgoliaReplicaPopular = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}_replica_popular`
}

export const resolveAlgoliaReplicaRecent = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}_replica_recent`
}

export const resolveAlgoliaReplicaCreated = (locale: Locale) => {
  return `${getAlgoliaIndexPrefix()}_${locale}_replica_created`
}

let algoliaSearchClient: ReturnType<typeof searchClient> | null = null

export const getAlgoliaSearchClient = () => {
  algoliaSearchClient ??= searchClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_SEARCH_KEY,
    ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
  )

  return algoliaSearchClient
}

let algoliaAdminClient: ReturnType<typeof searchClient> | null = null

export const getAlgoliaAdminClient = () => {
  algoliaAdminClient ??= searchClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_ADMIN_KEY,
    ALGOLIA_WAIT_ON_RATE_LIMIT
  )

  return algoliaAdminClient
}

let algoliaRecommendClient: ReturnType<typeof recommendClient> | null = null

export const getAlgoliaRecommendClient = () => {
  algoliaRecommendClient ??= recommendClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_SEARCH_KEY,
    ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
  )

  return algoliaRecommendClient
}

let algoliaInsightsClient: ReturnType<typeof insightsClient> | null = null

export const getAlgoliaInsightsClient = () => {
  algoliaInsightsClient ??= insightsClient(
    serverEnv.VITE_ALGOLIA_APP_ID,
    serverEnv.ALGOLIA_ADMIN_KEY,
    undefined,
    ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
  )

  return algoliaInsightsClient
}

export const readConsentedAlgoliaUserToken = () => {
  return matchIsAnalyticsConsentGiven()
    ? getCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)
    : undefined
}

const buildAlgoliaContentLocaleFilter = (
  contentLocales: MemeContentLocale[]
) => {
  return `(${contentLocales
    .map((contentLocale) => {
      return `contentLocale:${contentLocale}`
    })
    .join(' OR ')})`
}

export const buildAlgoliaPublishedFilter = (
  contentLocales: MemeContentLocale[] | undefined
) => {
  const filters = [`status:${MemeStatus.PUBLISHED}`]

  if (contentLocales) {
    filters.push(
      buildAlgoliaContentLocaleFilter(
        contentLocalesWithUniversal(contentLocales)
      )
    )
  }

  return filters.join(' AND ')
}

export const buildAlgoliaExclusionFilter = (ids: string[]) => {
  return ids
    .map((id) => {
      return `NOT objectID:${id}`
    })
    .join(' AND ')
}

export const safeAlgoliaOp = async <TResult>(promise: Promise<TResult>) => {
  try {
    return await promise
  } catch (error) {
    algoliaLogger.error({ error }, 'Algolia operation failed')
    Sentry.captureException(error)

    return null
  }
}
