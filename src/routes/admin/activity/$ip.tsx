import { createFileRoute } from '@tanstack/react-router'
import { ACTIVITY_PAGE_SCHEMA } from '~/constants/activity'
import { getAdminVisitorDetailQueryOpts } from '~/routes/admin/-lib/queries'
import { VisitorPage } from '~/routes/admin/activity/-components/visitor-page'

export const Route = createFileRoute('/admin/activity/$ip')({
  component: VisitorPage,
  validateSearch: ACTIVITY_PAGE_SCHEMA,
  loader: async ({ params, context }) => {
    await context.queryClient.query({
      ...getAdminVisitorDetailQueryOpts(params.ip),
      staleTime: 'static'
    })

    return { crumb: params.ip }
  },
  head: ({ params }) => {
    return { meta: [{ title: `Admin Petit Meme - ${params.ip}` }] }
  }
})
