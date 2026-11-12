import { createFileRoute, redirect } from '@tanstack/react-router'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'

export const Route = createFileRoute('/_public__root/_default/settings')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/' })
    }

    const premiumSubscription = await context.queryClient.query({
      ...getPremiumSubscriptionQueryOpts(),
      staleTime: 'static'
    })

    return { user: context.user, premiumSubscription }
  }
})
