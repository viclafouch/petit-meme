import {
  type ClickedObjectIDs,
  type ClickedObjectIDsAfterSearch,
  type ConvertedObjectIDs,
  type ConvertedObjectIDsAfterSearch,
  type EventsItems,
  type ViewedObjectIDs,
  insightsClient
} from '@algolia/client-insights'
import * as Sentry from '@sentry/tanstackstart-react'
import { createClientOnlyFn } from '@tanstack/react-start'
import { ALGOLIA_FAIL_FAST_ON_RATE_LIMIT } from '~/constants/algolia'
import { COOKIE_ALGOLIA_USER_TOKEN_KEY } from '~/constants/cookie'
import { clientEnv } from '~/env/client'
import { readClientCookie } from '~/lib/cookie'
import { matchIsAnalyticsConsentGiven } from '~/lib/cookie-consent'
import { runInBackground } from '~/lib/main-thread'
import { getLocale } from '~/paraglide/runtime'

const algoliaInsights = insightsClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  clientEnv.VITE_ALGOLIA_INSIGHTS_KEY,
  undefined,
  ALGOLIA_FAIL_FAST_ON_RATE_LIMIT
)

function logInsightsError(error: unknown) {
  console.warn('[Algolia Insights]', error)
  Sentry.captureException(error)
}

function getUserToken() {
  if (!matchIsAnalyticsConsentGiven()) {
    return null
  }

  return readClientCookie(COOKIE_ALGOLIA_USER_TOKEN_KEY) ?? null
}

const ALGOLIA_MAX_OBJECTS_PER_EVENT = 20

function getInsightsIndex() {
  return `${clientEnv.VITE_ALGOLIA_INDEX}_${getLocale()}`
}

const pushEvent = (event: EventsItems) => {
  runInBackground(async () => {
    try {
      await algoliaInsights.pushEvents({ events: [event] })
    } catch (error) {
      logInsightsError(error)
    }
  })
}

export type ConversionEventName =
  | 'Meme Bookmarked'
  | 'Meme Studio Opened'
  | 'Meme MP4 Downloaded'
  | 'Meme MP3 Downloaded'
  | 'Meme MP4 Shared'
  | 'Meme MP3 Shared'
  | 'Meme Link Copied'

export type InsightsTracking = {
  queryID?: string
  authenticatedUserToken?: string
}

type BaseEventParams = InsightsTracking & {
  objectID: string
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
      index: getInsightsIndex(),
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
      index: getInsightsIndex(),
      objectIDs: [objectID],
      userToken,
      authenticatedUserToken
    }

    if (queryID) {
      pushEvent({
        ...base,
        queryID
      } satisfies ConvertedObjectIDsAfterSearch)
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

    for (
      let offset = 0;
      offset < objectIDs.length;
      offset += ALGOLIA_MAX_OBJECTS_PER_EVENT
    ) {
      pushEvent({
        eventType: 'view',
        eventName: 'Memes Viewed',
        index: getInsightsIndex(),
        objectIDs: objectIDs.slice(
          offset,
          offset + ALGOLIA_MAX_OBJECTS_PER_EVENT
        ),
        userToken,
        authenticatedUserToken
      } satisfies ViewedObjectIDs)
    }
  }
)
