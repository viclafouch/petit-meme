import { createFileRoute } from '@tanstack/react-router'
import { ACTIVITY_PAGE_SCHEMA } from '~/constants/activity'
import { getAdminUserDetailQueryOpts } from '~/routes/admin/-lib/queries'
import { UserPage } from '~/routes/admin/users/-components/user-page'

export const Route = createFileRoute('/admin/users/$userId')({
  component: UserPage,
  validateSearch: ACTIVITY_PAGE_SCHEMA,
  loader: async ({ params, context }) => {
    const detail = await context.queryClient.query({
      ...getAdminUserDetailQueryOpts(params.userId),
      staleTime: 'static'
    })

    return { crumb: detail.user.name }
  },
  head: ({ loaderData }) => {
    return {
      meta: [
        { title: `Admin Petit Meme - ${loaderData?.crumb ?? 'Utilisateur'}` }
      ]
    }
  }
})
