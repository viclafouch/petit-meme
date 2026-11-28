import { MonitorDown } from 'lucide-react'
import { InstallAppButton } from '~/components/install/install-app-button'
import { getInstallGuide } from '~/components/install/install-guide'
import { InstallGuideSteps } from '~/components/install/install-guide-steps'
import {
  useInstallApp,
  useInstallMethod
} from '~/components/install/use-install-app'
import { Button } from '~/components/ui/button'
import { m } from '~/paraglide/messages'

export const PhoneInstallAction = () => {
  const method = useInstallMethod()

  if (method === null) {
    return <div aria-hidden="true" className="h-12" />
  }

  if (method === 'installed') {
    return <p className="font-medium">{m.app_page_installed()}</p>
  }

  if (method === 'native') {
    return (
      <InstallAppButton
        surface="app-page"
        size="xl"
        className="w-full rounded-full sm:w-auto"
      />
    )
  }

  const guide = getInstallGuide(method)

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border bg-card p-5">
      <p className="text-sm font-medium">{guide.description}</p>
      <InstallGuideSteps steps={guide.steps} />
    </div>
  )
}

export const ComputerInstallAction = () => {
  const { method, install } = useInstallApp()

  if (method !== 'native') {
    return null
  }

  return (
    <Button
      type="button"
      variant="link"
      className="h-auto self-start px-0 text-muted-foreground"
      onClick={() => {
        void install('app-page')
      }}
    >
      <MonitorDown aria-hidden="true" />
      {m.app_page_install_computer()}
    </Button>
  )
}
