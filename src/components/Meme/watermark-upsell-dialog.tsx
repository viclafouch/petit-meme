import type { WithDialog } from '~/@types/dialog'
import { WatermarkedVideoButton } from '~/components/Meme/watermarked-video-button'
import { PremiumUpsellDialog } from '~/components/premium-upsell-dialog'
import type { MemeExportMode } from '~/constants/meme'
import { m } from '~/paraglide/messages.js'
import type { ExportableMeme } from '~/utils/meme-export'

type WatermarkUpsellDialogProps = WithDialog<{
  meme: ExportableMeme
  mode: MemeExportMode
}>

const TITLES = {
  download: m.watermark_upsell_title_download,
  share: m.watermark_upsell_title_share
} as const satisfies Record<MemeExportMode, () => string>

const CONFIRM_LABELS = {
  download: m.watermark_download_with_watermark,
  share: m.watermark_share_with_watermark
} as const satisfies Record<MemeExportMode, () => string>

export const WatermarkUpsellDialog = ({
  open,
  onOpenChange,
  meme,
  mode
}: WatermarkUpsellDialogProps) => {
  return (
    <PremiumUpsellDialog
      open={open}
      onOpenChange={onOpenChange}
      imageUrl="/images/premium-upsell.webp"
      title={TITLES[mode]()}
      description={m.watermark_upsell_description()}
      secondaryAction={
        <WatermarkedVideoButton
          meme={meme}
          mode={mode}
          label={CONFIRM_LABELS[mode]()}
          onExported={() => {
            onOpenChange(false)
          }}
        />
      }
    />
  )
}
