import type { WithDialog } from '~/@types/dialog'
import { PremiumUpsellDialog } from '~/components/premium-upsell-dialog'
import { m } from '~/paraglide/messages.js'

export const AiSearchUpsellDialog = ({
  open,
  onOpenChange
}: WithDialog<Record<string, never>>) => {
  return (
    <PremiumUpsellDialog
      open={open}
      onOpenChange={onOpenChange}
      imageUrl="/images/premium-upsell.webp"
      title={m.ai_search_upsell_title()}
      description={m.ai_search_upsell_description()}
    />
  )
}
