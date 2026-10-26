import { createFileRoute } from '@tanstack/react-router'
import { getAdminUsersListQueryOpts } from '~/routes/admin/-lib/queries'
import { UsersPage } from '~/routes/admin/users/-components/users-page'

export const Route = createFileRoute('/admin/users/')({
  component: UsersPage,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Utilisateurs' }] }
  },
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getAdminUsersListQueryOpts(),
      staleTime: 'static'
    })

    return { crumb: 'Utilisateurs' }
  }
})
