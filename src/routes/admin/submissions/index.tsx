import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { MemeSubmissionStatus } from '~/db/generated/prisma/enums'
import { getAdminSubmissionsQueryOpts } from '~/routes/admin/-lib/queries'
import { SubmissionsPage } from '~/routes/admin/submissions/-components/submissions-page'

const SEARCH_SCHEMA = z.object({
  // oxlint-disable-next-line promise/prefer-await-to-then, unicorn/no-useless-undefined -- Zod's catch() sets the parse fallback, it is no promise, and undefined is the fallback value
  submissionStatus: z.enum(MemeSubmissionStatus).optional().catch(undefined)
})

export const Route = createFileRoute('/admin/submissions/')({
  component: SubmissionsPage,
  validateSearch: (search) => {
    return SEARCH_SCHEMA.parse(search)
  },
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Soumissions' }] }
  },
  loaderDeps: ({ search }) => {
    return { submissionStatus: search.submissionStatus }
  },
  loader: async ({ deps, context }) => {
    await context.queryClient.query({
      ...getAdminSubmissionsQueryOpts(deps.submissionStatus),
      staleTime: 'static'
    })

    return {
      crumb: 'Soumissions'
    }
  }
})
