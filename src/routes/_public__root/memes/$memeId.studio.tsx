import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { StudioSheet } from '~/components/studio/studio-sheet'
import studioCss from '~/components/studio/studio.css?url'
import { CAPTION_FONT_FILES } from '~/constants/studio'
import { buildPageTitle } from '~/lib/seo/meta'
import { m } from '~/paraglide/messages'
import { getMemeQueryOpts } from '~/queries/meme'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'

const FALLBACK_WIDTH = 1280
const FALLBACK_HEIGHT = 720

const StudioRoutePage = () => {
  const { memeId } = Route.useParams()
  const memeQuery = useSuspenseQuery(getMemeQueryOpts(memeId))

  return (
    <StudioSheet
      meme={{
        id: memeQuery.data.id,
        title: memeQuery.data.title,
        bunnyId: memeQuery.data.video.bunnyId,
        width: memeQuery.data.video.width ?? FALLBACK_WIDTH,
        height: memeQuery.data.video.height ?? FALLBACK_HEIGHT
      }}
    />
  )
}

export const Route = createFileRoute('/_public__root/memes/$memeId/studio')({
  loader: async ({ params, context }) => {
    const [meme] = await Promise.all([
      context.queryClient.query({
        ...getMemeQueryOpts(params.memeId),
        staleTime: 'static'
      }),
      context.user
        ? context.queryClient.query({
            ...getPremiumSubscriptionQueryOpts(),
            staleTime: 'static'
          })
        : null
    ])

    return { title: meme.title }
  },
  head: ({ loaderData }) => {
    return {
      meta: loaderData
        ? [{ title: buildPageTitle(m.studio_page_title(loaderData)) }]
        : [],
      links: [
        { rel: 'stylesheet', href: studioCss },
        ...CAPTION_FONT_FILES.map(({ url }) => {
          return {
            rel: 'preload',
            as: 'font',
            type: 'font/woff2',
            crossOrigin: 'anonymous' as const,
            href: url
          }
        })
      ]
    }
  },
  component: StudioRoutePage
})
