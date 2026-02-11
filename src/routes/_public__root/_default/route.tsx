import { Container } from '@/components/ui/container'
import {
  getActiveSubscriptionQueryOpts,
  getCategoriesListQueryOpts,
  getFavoritesMemesQueryOpts
} from '@/lib/queries'
import { createFileRoute, Outlet } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <div className="pb-10 pt-10 sm:pt-12">
      <Container>
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

    void context.queryClient.ensureQueryData(getCategoriesListQueryOpts())
  }
})
