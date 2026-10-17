import { createFileRoute, redirect } from '@tanstack/react-router'
import { ErrorComponent } from '~/components/error-component'
import { FLAG_CDN_ORIGIN } from '~/helpers/country'
import { AdminLayout } from '~/routes/admin/-components/admin-layout'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  errorComponent: ErrorComponent,
  beforeLoad: async ({ context }) => {
    if (context.user?.role !== 'admin') {
      throw redirect({ to: '/' })
    }

    return { user: context.user }
  },
  head: () => {
    return {
      meta: [{ name: 'robots', content: 'noindex,nofollow' }],
      links: [{ rel: 'preconnect', href: FLAG_CDN_ORIGIN }]
    }
  }
})
