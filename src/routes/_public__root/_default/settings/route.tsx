import { createFileRoute, redirect } from '@tanstack/react-router'
import { getActiveSubscriptionQueryOpts } from '~/lib/queries'

export const Route = createFileRoute('/_public__root/_default/settings')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/' })
    }

    const activeSubscription = await context.queryClient.query({
      ...getActiveSubscriptionQueryOpts(),
      staleTime: 'static'
    })

    return { user: context.user, activeSubscription }
  }
})
