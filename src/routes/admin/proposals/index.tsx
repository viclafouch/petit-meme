import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { MemeProposalStatus } from '~/db/generated/prisma/enums'
import { listAdminProposalsQueryOpts } from '~/routes/admin/-lib/queries'
import { ProposalsPage } from '~/routes/admin/proposals/-components/proposals-page'

const SEARCH_SCHEMA = z.object({
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  proposalStatus: z.enum(MemeProposalStatus).optional().catch(undefined)
})

export const Route = createFileRoute('/admin/proposals/')({
  component: ProposalsPage,
  validateSearch: (search) => {
    return SEARCH_SCHEMA.parse(search)
  },
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Propositions' }] }
  },
  loaderDeps: ({ search }) => {
    return { proposalStatus: search.proposalStatus }
  },
  loader: async ({ deps, context }) => {
    await context.queryClient.query({
      ...listAdminProposalsQueryOpts(deps.proposalStatus),
      staleTime: 'static'
    })

    return {
      crumb: 'Propositions'
    }
  }
})
