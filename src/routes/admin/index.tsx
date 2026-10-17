import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '~/routes/admin/-components/dashboard/dashboard-page'
import { PERIOD_SCHEMA } from '~/routes/admin/-server/dashboard'

const dashboardSearchSchema = z.object({
  // oxlint-disable-next-line promise/prefer-await-to-then -- Zod's catch() sets the parse fallback, it is no promise
  period: PERIOD_SCHEMA.optional().default('30d').catch('30d')
})

export const Route = createFileRoute('/admin/')({
  component: DashboardPage,
  validateSearch: dashboardSearchSchema,
  head: () => {
    return {
      meta: [{ title: 'Dashboard — Admin' }]
    }
  }
})
