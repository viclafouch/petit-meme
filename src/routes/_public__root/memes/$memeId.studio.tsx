import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { StudioSheet } from '~/components/studio/studio-sheet'
import {
  useCloseStudio,
  usePlaceMemePageBelowStudio
} from '~/components/studio/use-studio-history'
import { toStudioMeme } from '~/helpers/studio-meme'
import { buildPageTitle } from '~/lib/seo/meta'
import { m } from '~/paraglide/messages'
import { getMemeQueryOpts } from '~/queries/meme'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'

const StudioRoutePage = () => {
  const { memeId } = Route.useParams()
  const memeQuery = useSuspenseQuery(getMemeQueryOpts(memeId))
  const closeStudio = useCloseStudio()

  usePlaceMemePageBelowStudio()

  return (
    <StudioSheet meme={toStudioMeme(memeQuery.data)} onClose={closeStudio} />
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
        : []
    }
  },
  component: StudioRoutePage
})
