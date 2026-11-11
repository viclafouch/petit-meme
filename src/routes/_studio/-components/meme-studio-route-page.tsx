import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import * as Sentry from '@sentry/tanstackstart-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  StudioCrashFallback,
  StudioLoadingFallback
} from '~/components/studio/studio-fallbacks'
import { StudioPage } from '~/components/studio/studio-page'
import { getMemeQueryOpts } from '~/lib/queries'

const memeStudioRouteApi = getRouteApi('/_studio/memes/$memeId/studio')

export const MemeStudioRoutePage = () => {
  const { memeId } = memeStudioRouteApi.useParams()
  const memeQuery = useSuspenseQuery(getMemeQueryOpts(memeId))

  return (
    <ErrorBoundary
      FallbackComponent={StudioCrashFallback}
      onError={(error) => {
        Sentry.captureException(error, {
          tags: { feature: 'studio' }
        })
      }}
    >
      <React.Suspense fallback={<StudioLoadingFallback />}>
        <StudioPage meme={memeQuery.data} />
      </React.Suspense>
    </ErrorBoundary>
  )
}
