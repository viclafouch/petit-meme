import type { WithDialog } from '~/@types/dialog'
import { WatermarkedVideoButton } from '~/components/meme/watermarked-video-button'
import { PremiumUpsellDialog } from '~/components/premium/premium-upsell-dialog'
import type { MemeExportMode } from '~/constants/meme'
import type { InsightsTracking } from '~/lib/algolia-insights'
import type { ExportableMeme } from '~/lib/meme-export'
import { m } from '~/paraglide/messages'

type AudioUpsellDialogProps = WithDialog<{
  meme: ExportableMeme
  mode: MemeExportMode
  tracking: InsightsTracking
}>

const TITLES = {
  download: m.audio_upsell_title_download,
  share: m.audio_upsell_title_share
} as const satisfies Record<MemeExportMode, () => string>

const VIDEO_LABELS = {
  download: m.audio_upsell_download_video,
  share: m.audio_upsell_share_video
} as const satisfies Record<MemeExportMode, () => string>

export const AudioUpsellDialog = ({
  open,
  onOpenChange,
  meme,
  mode,
  tracking
}: AudioUpsellDialogProps) => {
  return (
    <PremiumUpsellDialog
      open={open}
      onOpenChange={onOpenChange}
      imageUrl="/images/premium-upsell.webp"
      title={TITLES[mode]()}
      description={m.audio_upsell_description()}
      secondaryAction={
        <WatermarkedVideoButton
          meme={meme}
          mode={mode}
          tracking={tracking}
          label={VIDEO_LABELS[mode]()}
          onExported={() => {
            onOpenChange(false)
          }}
        />
      }
    />
  )
}
