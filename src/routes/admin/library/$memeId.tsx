import { createFileRoute } from '@tanstack/react-router'
import { buildMemeSeo } from '~/lib/seo'
import {
  getAdminMemeQueryOpts,
  getAdminMemeFillQueryOpts
} from '~/routes/admin/-lib/queries'
import { MemePage } from '~/routes/admin/library/-components/meme-page'

export const Route = createFileRoute('/admin/library/$memeId')({
  component: MemePage,
  loader: async ({ params, context }) => {
    const [meme] = await Promise.all([
      context.queryClient.query({
        ...getAdminMemeQueryOpts(params.memeId),
        staleTime: 'static'
      }),
      context.queryClient.query({
        ...getAdminMemeFillQueryOpts(params.memeId),
        staleTime: 'static'
      })
    ])

    return { meme }
  },
  head: ({ loaderData }) => {
    if (loaderData?.meme) {
      return buildMemeSeo(loaderData.meme, { isAdmin: true })
    }

    return {}
  }
})
