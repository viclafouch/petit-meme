import { createFileRoute } from '@tanstack/react-router'
import { ACTIVITY_FILTERS_SCHEMA } from '~/constants/activity'
import { ActivityPage } from '~/routes/admin/activity/-components/activity-page'

export const Route = createFileRoute('/admin/activity/')({
  component: ActivityPage,
  validateSearch: ACTIVITY_FILTERS_SCHEMA,
  head: () => {
    return { meta: [{ title: 'Admin Petit Meme - Activité' }] }
  },
  loader: () => {
    return { crumb: 'Activité' }
  }
})
