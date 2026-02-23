import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { StudioPage } from '@/components/Meme/Studio/studio-page'
import {
  StudioErrorFallback,
  StudioLoadingFallback
} from '@/components/Meme/studio-fallbacks'
import { buildVideoImageUrl } from '@/lib/bunny'
import { getMemeByIdQueryOpts } from '@/lib/queries'
import { buildMemeSeo } from '@/lib/seo'
import { getRelatedMemes } from '@/server/meme'
import * as Sentry from '@sentry/tanstackstart-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  const { memeId } = Route.useParams()
  const { relatedMemesPromise } = Route.useLoaderData()
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

export const Route = createFileRoute('/_studio/memes/$memeId/studio')({
  component: RouteComponent,
  pendingComponent: StudioLoadingFallback,
  ssr: 'data-only',
  loader: async ({ params, context }) => {
    const meme = await context.queryClient.ensureQueryData(
      getMemeByIdQueryOpts(params.memeId)
    )

    const relatedMemesPromise = getRelatedMemes({
      data: { memeId: meme.id, title: meme.title }
    })

    return { meme, relatedMemesPromise }
  },
  head: ({ loaderData, match }) => {
    if (loaderData?.meme) {
      const { meme } = loaderData
      const result = buildMemeSeo(meme, {
        pathname: match.pathname,
        noindex: true,
        canonicalPathname: `/memes/${meme.id}`
      })

      return {
        ...result,
        links: [
          ...(result.links ?? []),
          {
            rel: 'preload',
            as: 'image',
            href: buildVideoImageUrl(meme.video.bunnyId)
          }
        ]
      }
    }

    return {}
  }
})
