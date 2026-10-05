import { noop } from '@tanstack/react-query'
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { Container } from '~/components/ui/container'
import { usePremiumReminder } from '~/hooks/use-premium-reminder'
import {
  getActiveSubscriptionQueryOpts,
  getCategoriesListQueryOpts,
  getFavoritesMemesQueryOpts
} from '~/lib/queries'
import { getLocale } from '~/paraglide/runtime'

const RouteComponent = () => {
  const pathname = useLocation({
    select: (location) => {
      return location.pathname
    }
  })
  const isMemeContentPage = pathname.startsWith('/memes')

  usePremiumReminder({ enabled: isMemeContentPage })

  return (
    <div className="pb-10 pt-10 sm:pt-12 flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col">
        <Outlet />
      </Container>
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default')({
  component: RouteComponent,
  loader: ({ context }) => {
    if (context.user) {
      void context.queryClient
        .query({
          ...getFavoritesMemesQueryOpts(),
          staleTime: 'static'
        })
        .catch(noop)
      void context.queryClient
        .query({
          ...getActiveSubscriptionQueryOpts(),
          staleTime: 'static'
        })
        .catch(noop)
    }

    void context.queryClient
      .query({
        ...getCategoriesListQueryOpts(getLocale()),
        staleTime: 'static'
      })
      .catch(noop)
  }
})
