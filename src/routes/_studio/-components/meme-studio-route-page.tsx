import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import * as Sentry from '@sentry/tanstackstart-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  StudioErrorFallback,
  StudioLoadingFallback
} from '~/components/Meme/studio-fallbacks'
import { StudioPage } from '~/components/Meme/Studio/studio-page'
import { getMemeByIdQueryOpts } from '~/lib/queries'

const memeStudioRouteApi = getRouteApi('/_studio/memes/$memeId/studio')

export const MemeStudioRoutePage = () => {
  const { memeId } = memeStudioRouteApi.useParams()
  const { relatedMemesPromise } = memeStudioRouteApi.useLoaderData()
  const memeQuery = useSuspenseQuery(getMemeByIdQueryOpts(memeId))

  return (
    <ErrorBoundary
      FallbackComponent={StudioErrorFallback}
      onError={(error) => {
        Sentry.captureException(error, {
          tags: { feature: 'studio' }
        })
      }}
    >
      <React.Suspense fallback={<StudioLoadingFallback />}>
        <StudioPage
          meme={memeQuery.data}
          relatedMemesPromise={relatedMemesPromise}
        />
      </React.Suspense>
    </ErrorBoundary>
  )
}
