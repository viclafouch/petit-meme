import { MonitorDown } from 'lucide-react'
import { useInstallApp } from '~/components/install/use-install-app'
import { Button } from '~/components/ui/button'
import type { InstallSurface } from '~/lib/install-app'
import { m } from '~/paraglide/messages'

type InstallAppButtonProps = {
  surface: InstallSurface
  className?: string
}

export const InstallAppButton = ({
  surface,
  className
}: InstallAppButtonProps) => {
  const { method, install } = useInstallApp()

  if (method === null || method === 'installed') {
    return null
  }

  return (
    <Button
      size="lg"
      className={className}
      onClick={() => {
        void install(surface)
      }}
    >
      <MonitorDown aria-hidden="true" />
      {m.install_cta()}
    </Button>
  )
}
