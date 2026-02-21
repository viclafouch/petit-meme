import { COOKIE_ALGOLIA_USER_TOKEN_KEY } from '@/constants/cookie'
import { clientEnv } from '@/env/client'
import { readClientCookie } from '@/helpers/cookie'
import { hasAcceptedCookies } from '@/lib/cookie-consent'
import type {
  ClickedObjectIDs,
  ClickedObjectIDsAfterSearch,
  ConvertedObjectIDs,
  ConvertedObjectIDsAfterSearch,
  EventsItems,
  ViewedObjectIDs
} from '@algolia/client-insights'
import { insightsClient } from '@algolia/client-insights'
import { createClientOnlyFn } from '@tanstack/react-start'

const algoliaInsights = insightsClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  clientEnv.VITE_ALGOLIA_SEARCH_KEY
)

function logInsightsError(error: unknown) {
  // eslint-disable-next-line no-console
  console.warn('[Algolia Insights]', error)
}

function getUserToken() {
  if (!hasAcceptedCookies()) {
    return null
  }

  return readClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY) ?? null
}

function pushEvent(event: EventsItems) {
  algoliaInsights.pushEvents({ events: [event] }).catch(logInsightsError)
}

export type ConversionEventName =
  | 'Meme Bookmarked'
  | 'Meme Studio Opened'
  | 'Meme Shared'
  | 'Meme Downloaded'
  | 'Meme Link Copied'

type BaseEventParams = {
  objectID: string
  queryID?: string
  authenticatedUserToken?: string
}

type SendClickEventParams = BaseEventParams & {
  position: number
}

export const sendClickEvent = createClientOnlyFn(
  ({
    objectID,
    authenticatedUserToken,
    queryID,
    position
  }: SendClickEventParams) => {
    const userToken = getUserToken()

    if (!userToken) {
      return
    }

    const base = {
      eventType: 'click' as const,
      eventName: 'Meme Clicked',
      index: clientEnv.VITE_ALGOLIA_INDEX,
      objectIDs: [objectID],
      userToken,
      authenticatedUserToken
    }

    if (queryID) {
      pushEvent({
        ...base,
        queryID,
        positions: [position]
      } satisfies ClickedObjectIDsAfterSearch)
    } else {
      pushEvent(base satisfies ClickedObjectIDs)
    }
  }
)

type SendConversionEventParams = BaseEventParams & {
  eventName: ConversionEventName
}

export const sendConversionEvent = createClientOnlyFn(
  ({
    objectID,
    eventName,
    authenticatedUserToken,
    queryID
  }: SendConversionEventParams) => {
    const userToken = getUserToken()

    if (!userToken) {
      return
    }

    const base = {
      eventType: 'conversion' as const,
      eventName,
      index: clientEnv.VITE_ALGOLIA_INDEX,
      objectIDs: [objectID],
      userToken,
      authenticatedUserToken
    }

    if (queryID) {
      pushEvent({ ...base, queryID } satisfies ConvertedObjectIDsAfterSearch)
    } else {
      pushEvent(base satisfies ConvertedObjectIDs)
    }
  }
)

type SendViewEventParams = {
  objectIDs: string[]
  authenticatedUserToken?: string
}

export const sendViewEvent = createClientOnlyFn(
  ({ objectIDs, authenticatedUserToken }: SendViewEventParams) => {
    const userToken = getUserToken()

    if (!userToken) {
      return
    }

    pushEvent({
      eventType: 'view',
      eventName: 'Memes Viewed',
      index: clientEnv.VITE_ALGOLIA_INDEX,
      objectIDs,
      userToken,
      authenticatedUserToken
    } satisfies ViewedObjectIDs)
  }
)
