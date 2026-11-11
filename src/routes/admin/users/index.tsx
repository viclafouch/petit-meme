import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PREMIUM_SOURCES } from '~/helpers/premium'
import { listAdminUsersQueryOpts } from '~/queries/admin/user'
import { UsersPage } from '~/routes/admin/users/-components/users-page'

const SEARCH_SCHEMA = z.object({
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  premium: z.enum(PREMIUM_SOURCES).optional().catch(undefined)
})

export const Route = createFileRoute('/admin/users/')({
  component: UsersPage,
  validateSearch: (search) => {
    return SEARCH_SCHEMA.parse(search)
  },
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Utilisateurs' }] }
  },
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...listAdminUsersQueryOpts(),
      staleTime: 'static'
    })

    return { crumb: 'Utilisateurs' }
  }
})
