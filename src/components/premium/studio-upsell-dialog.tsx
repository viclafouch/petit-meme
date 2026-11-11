import type { WithDialog } from '~/@types/dialog'
import { PremiumUpsellDialog } from '~/components/premium/premium-upsell-dialog'
import { m } from '~/paraglide/messages.js'

type StudioUpsellDialogProps = WithDialog

export const StudioUpsellDialog = ({
  open,
  onOpenChange
}: StudioUpsellDialogProps) => {
  return (
    <PremiumUpsellDialog
      open={open}
      onOpenChange={onOpenChange}
      imageUrl="/images/premium-upsell.webp"
      title={m.studio_upsell_title()}
      description={m.studio_upsell_description()}
    />
  )
}
