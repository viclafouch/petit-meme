import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Container } from '~/components/ui/container'
import {
  getActiveSubscriptionQueryOpts,
  getCategoriesListQueryOpts,
  getFavoritesMemesQueryOpts
} from '~/lib/queries'
import { getLocale } from '~/paraglide/runtime'

const RouteComponent = () => {
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
      void context.queryClient.ensureQueryData(getFavoritesMemesQueryOpts())
      void context.queryClient.ensureQueryData(getActiveSubscriptionQueryOpts())
    }

    void context.queryClient.ensureQueryData(
      getCategoriesListQueryOpts(getLocale())
    )
  }
})
