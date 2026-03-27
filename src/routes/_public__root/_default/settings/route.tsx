import { getActiveSubscriptionQueryOpts } from '~/lib/queries'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

const RouteComponent = () => {
  return <Outlet />
}

export const Route = createFileRoute('/_public__root/_default/settings')({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/' })
    }

    const activeSubscription = await context.queryClient.ensureQueryData(
      getActiveSubscriptionQueryOpts()
    )

    return { user: context.user, activeSubscription }
  }
})
