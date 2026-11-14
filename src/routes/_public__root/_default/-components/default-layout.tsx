import { Outlet } from '@tanstack/react-router'
import { Container } from '~/components/ui/container'

export const DefaultLayout = () => {
  return (
    <div className="pb-10 pt-10 sm:pt-12 flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col">
        <Outlet />
      </Container>
    </div>
  )
}
