import type React from 'react'
import { MonitorDown } from 'lucide-react'
import { useInstallApp } from '~/components/install/use-install-app'
import { Button } from '~/components/ui/button'
import type { InstallSurface } from '~/lib/install-app'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

type InstallAppButtonProps = {
  surface: InstallSurface
} & Pick<React.ComponentProps<typeof Button>, 'size' | 'variant' | 'className'>

export const InstallAppButton = ({
  surface,
  size = 'lg',
  variant,
  className
}: InstallAppButtonProps) => {
  const { install } = useInstallApp()

  return (
    <Button
      size={size}
      variant={variant}
      className={cn('standalone:hidden', className)}
      onClick={() => {
        void install(surface)
      }}
    >
      <MonitorDown aria-hidden="true" />
      {m.install_cta()}
    </Button>
  )
}
