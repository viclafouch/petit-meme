import { clientEnv } from '@/env/client'
import { serverEnv } from '@/env/server'
import { algoliaIndexName, safeAlgoliaOp } from '@/lib/algolia'
import { insightsClient } from '@algolia/client-insights'
import { createServerOnlyFn } from '@tanstack/react-start'

const algoliaInsightsServer = insightsClient(
  clientEnv.VITE_ALGOLIA_APP_ID,
  serverEnv.ALGOLIA_ADMIN_KEY
)

type SendAlgoliaViewEventParams = {
  memeId: string
  userToken: string
}

export const sendAlgoliaViewEvent = createServerOnlyFn(
  ({ memeId, userToken }: SendAlgoliaViewEventParams) => {
    return safeAlgoliaOp(
      algoliaInsightsServer.pushEvents({
        events: [
          {
            eventType: 'view',
            eventName: 'Meme Viewed',
            index: algoliaIndexName,
            objectIDs: [memeId],
            userToken
          }
        ]
      })
    )
  }
)
