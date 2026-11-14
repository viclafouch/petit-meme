import type { WithDialog } from '~/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/animate-ui/base/dialog'
import { AppIcon } from '~/components/install/app-icon'
import {
  getInstallGuide,
  type InstallGuideMethod
} from '~/components/install/install-guide'
import { InstallGuideSteps } from '~/components/install/install-guide-steps'
import { Button } from '~/components/ui/button'
import { m } from '~/paraglide/messages'

type InstallAppDialogProps = WithDialog<{
  method: InstallGuideMethod
}>

export const InstallAppDialog = ({
  open,
  onOpenChange,
  method
}: InstallAppDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-5">
          <AppIcon size={64} className="size-16 shadow-lg" />
          <DialogHeader className="gap-1 text-center">
            <DialogTitle className="text-lg font-bold tracking-tight">
              {m.install_guide_title()}
            </DialogTitle>
            <DialogDescription className="text-center text-balance">
              {getInstallGuide(method).description}
            </DialogDescription>
          </DialogHeader>
          <InstallGuideSteps method={method} className="w-full" />
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {m.install_guide_done()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
