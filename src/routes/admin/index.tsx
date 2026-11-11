import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '~/routes/admin/-components/dashboard/dashboard-page'
import {
  listAdminRecentActivityQueryOpts,
  listAdminRecentAuditQueryOpts
} from '~/routes/admin/-lib/queries'
import { PERIOD_SCHEMA } from '~/server/admin/dashboard/dashboard.functions'

const dashboardSearchSchema = z.object({
  // oxlint-disable-next-line promise/prefer-await-to-then -- Zod's catch() sets the parse fallback, it is no promise
  period: PERIOD_SCHEMA.optional().default('30d').catch('30d')
})

export const Route = createFileRoute('/admin/')({
  component: DashboardPage,
  validateSearch: dashboardSearchSchema,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({
        ...listAdminRecentAuditQueryOpts(),
        staleTime: 'static'
      }),
      context.queryClient.query({
        ...listAdminRecentActivityQueryOpts(),
        staleTime: 'static'
      })
    ])
  },
  head: () => {
    return {
      meta: [{ title: 'Dashboard — Admin' }]
    }
  }
})
