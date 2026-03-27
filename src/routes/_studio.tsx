import { createFileRoute, Outlet } from '@tanstack/react-router'
import { StarsBackground } from '~/components/animate-ui/backgrounds/stars'

const RouteComponent = () => {
  return (
    <StarsBackground>
      <div className="z-10 relative h-dvh flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </StarsBackground>
  )
}

export const Route = createFileRoute('/_studio')({
  component: RouteComponent
})
