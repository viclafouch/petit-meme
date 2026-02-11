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
  loader: async ({ context }) => {
    if (context.user) {
      void context.queryClient.fetchQuery(getFavoritesMemesQueryOpts())
      void context.queryClient.fetchQuery(getActiveSubscriptionQueryOpts())
    }

    void context.queryClient.fetchQuery(getCategoriesListQueryOpts())
  }
})
