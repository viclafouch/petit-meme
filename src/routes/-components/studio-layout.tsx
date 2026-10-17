import { Outlet } from '@tanstack/react-router'
import { StarsBackground } from '~/components/animate-ui/backgrounds/stars'

export const StudioLayout = () => {
  return (
    <StarsBackground animated={false}>
      <div className="z-10 relative h-dvh flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </StarsBackground>
  )
}
