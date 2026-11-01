import type { WithDialog } from '~/@types/dialog'
import { PremiumUpsellDialog } from '~/components/premium-upsell-dialog'
import { m } from '~/paraglide/messages.js'

type BookmarkUpsellDialogProps = WithDialog<Record<string, never>>

export const BookmarkUpsellDialog = ({
  open,
  onOpenChange
}: BookmarkUpsellDialogProps) => {
  return (
    <PremiumUpsellDialog
      open={open}
      onOpenChange={onOpenChange}
      imageUrl="/images/premium-upsell.webp"
      title={m.bookmark_upsell_title()}
      description={m.bookmark_upsell_description()}
    />
  )
}
