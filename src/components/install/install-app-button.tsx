import { MonitorDown } from 'lucide-react'
import { useInstallApp } from '~/components/install/use-install-app'
import { Button } from '~/components/ui/button'
import { m } from '~/paraglide/messages'

type InstallAppButtonProps = {
  className?: string
}

export const InstallAppButton = ({ className }: InstallAppButtonProps) => {
  const { method, install } = useInstallApp()

  if (method === null || method === 'installed') {
    return null
  }

  return (
    <Button
      size="lg"
      className={className}
      onClick={() => {
        void install()
      }}
    >
      <MonitorDown aria-hidden="true" />
      {m.install_cta()}
    </Button>
  )
}
