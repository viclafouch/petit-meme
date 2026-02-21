import { COOKIE_ALGOLIA_USER_TOKEN_KEY } from '@/constants/cookie'
import { clientEnv } from '@/env/client'
import { readClientCookie } from '@/helpers/cookie'
import { hasAcceptedCookies } from '@/lib/cookie-consent'
import type {
  ClickedObjectIDsAfterSearch,
  ConvertedObjectIDsAfterSearch
} from '@algolia/client-insights'
import { insightsClient } from '@algolia/client-insights'
import { createClientOnlyFn } from '@tanstack/react-start'

const algoliaInsights = insightsClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  clientEnv.VITE_ALGOLIA_SEARCH_KEY
)

type SendClickAfterSearchParams = {
  queryID: string
  objectID: string
  position: number
}

export const sendClickAfterSearch = createClientOnlyFn(
  ({ queryID, objectID, position }: SendClickAfterSearchParams) => {
    if (!hasAcceptedCookies()) {
      return
    }

    const userToken = readClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)

    if (!userToken) {
      return
    }

    const event: ClickedObjectIDsAfterSearch = {
      eventType: 'click',
      eventName: 'Meme Clicked',
      index: clientEnv.VITE_ALGOLIA_INDEX,
      queryID,
      objectIDs: [objectID],
      positions: [position],
      userToken
    }

    algoliaInsights.pushEvents({ events: [event] }).catch(() => {})
  }
)

type SendConversionAfterSearchParams = {
  queryID: string
  objectID: string
  eventName: string
}

export const sendConversionAfterSearch = createClientOnlyFn(
  ({ queryID, objectID, eventName }: SendConversionAfterSearchParams) => {
    if (!hasAcceptedCookies()) {
      return
    }

    const userToken = readClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY)

    if (!userToken) {
      return
    }

    const event: ConvertedObjectIDsAfterSearch = {
      eventType: 'conversion',
      eventName,
      index: clientEnv.VITE_ALGOLIA_INDEX,
      queryID,
      objectIDs: [objectID],
      userToken
    }

    algoliaInsights.pushEvents({ events: [event] }).catch(() => {})
  }
)
