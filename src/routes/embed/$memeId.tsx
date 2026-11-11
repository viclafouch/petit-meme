import { createFileRoute, notFound } from '@tanstack/react-router'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { getMemeQueryOpts, getMemePlaybackUrlQueryOpts } from '~/lib/queries'
import { EmbedPage } from './-components/embed-page'

export const Route = createFileRoute('/embed/$memeId')({
  component: EmbedPage,
  loader: async ({ params, context }) => {
    const meme = await context.queryClient.query({
      ...getMemeQueryOpts(params.memeId),
      staleTime: 'static'
    })

    if (meme.status !== MemeStatus.PUBLISHED) {
      throw notFound()
    }

    void Promise.allSettled([
      context.queryClient.query(getMemePlaybackUrlQueryOpts(meme.id))
    ])

    return { meme }
  },
  headers: () => {
    return { 'Content-Security-Policy': 'frame-ancestors *' }
  },
  head: ({ loaderData }) => {
    return {
      meta: [
        { title: loaderData?.meme.title },
        { name: 'robots', content: 'noindex' }
      ]
    }
  }
})
