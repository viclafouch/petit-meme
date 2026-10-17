import { createFileRoute } from '@tanstack/react-router'
import { getListUsers } from '~/routes/admin/-server/users'
import { UsersPage } from '~/routes/admin/users/-components/users-page'

export const Route = createFileRoute('/admin/users/')({
  component: UsersPage,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Utilisateurs' }] }
  },
  loader: async () => {
    const { users } = await getListUsers()

    return {
      crumb: 'Utilisateurs',
      users
    }
  }
})
