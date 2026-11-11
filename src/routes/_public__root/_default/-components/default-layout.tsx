import { Outlet, useLocation } from '@tanstack/react-router'
import { usePremiumReminder } from '~/components/premium/use-premium-reminder'
import { Container } from '~/components/ui/container'

export const DefaultLayout = () => {
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
