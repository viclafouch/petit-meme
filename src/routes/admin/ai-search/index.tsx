import { createFileRoute } from '@tanstack/react-router'
import { getAdminAiSearchLogsQueryOpts } from '~/routes/admin/-lib/queries'
import { AiSearchPage } from '~/routes/admin/ai-search/-components/ai-search-page'

export const Route = createFileRoute('/admin/ai-search/')({
  component: AiSearchPage,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Recherche IA' }] }
  },
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getAdminAiSearchLogsQueryOpts(),
      staleTime: 'static'
    })

    return { crumb: 'Recherche IA' }
  }
})
