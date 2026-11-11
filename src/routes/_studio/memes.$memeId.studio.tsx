import { createFileRoute } from '@tanstack/react-router'
import { StudioLoadingFallback } from '~/components/studio/studio-fallbacks'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { buildMemeSeo } from '~/lib/seo/meta'
import { getMemeQueryOpts, listRelatedMemesQueryOpts } from '~/queries/meme'
import { MemeStudioRoutePage } from './-components/meme-studio-route-page'

export const Route = createFileRoute('/_studio/memes/$memeId/studio')({
  component: MemeStudioRoutePage,
  pendingComponent: StudioLoadingFallback,
  ssr: 'data-only',
  loader: async ({ params, context }) => {
    const meme = await context.queryClient.query({
      ...getMemeQueryOpts(params.memeId),
      staleTime: 'static'
    })

    void Promise.allSettled([
      context.queryClient.query(
        listRelatedMemesQueryOpts({ memeId: meme.id, title: meme.title })
      )
    ])

    return { meme }
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
          ...result.links,
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
