import React from 'react'
import { Download, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import type { WithDialog } from '~/@types/dialog'
import { PremiumUpsellDialog } from '~/components/premium-upsell-dialog'
import { Button } from '~/components/ui/button'
import { LoadingSpinner } from '~/components/ui/spinner'
import type { MemeWithVideo } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import type { MemeExportMode } from '~/hooks/use-meme-export'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { shareMeme, trackMemeAction } from '~/server/meme'
import { downloadBlob, shareBlob } from '~/utils/download'

type WatermarkUpsellDialogParams = {
  meme: Pick<MemeWithVideo, 'id' | 'title'>
  mode: MemeExportMode
}

const getTitle = (mode: MemeExportMode) => {
  if (mode === 'download') {
    return m.watermark_upsell_title_download()
  }

  return m.watermark_upsell_title_share()
}

const getConfirmLabel = (mode: MemeExportMode) => {
  if (mode === 'download') {
    return m.watermark_download_with_watermark()
  }

  return m.watermark_share_with_watermark()
}

const CONFIRM_ICONS = {
  download: Download,
  share: Share2
} as const satisfies Record<MemeExportMode, React.ElementType>

export const WatermarkUpsellDialog = ({
  open,
  onOpenChange,
  meme,
  mode
}: WithDialog<WatermarkUpsellDialogParams>) => {
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await shareMeme({ data: meme.id })
      const blob = await response.blob()

      if (mode === 'download') {
        downloadBlob(blob, meme.title)

        return true
      }

      return shareBlob(blob, meme.title)
    },
    onSuccess: (wasExported) => {
      if (wasExported) {
        onOpenChange(false)
        void trackMemeAction({ data: { memeId: meme.id, action: mode } })
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
      captureWithFeature(error, mode)
    }
  })

  const ConfirmIcon = CONFIRM_ICONS[mode]

  return (
    <PremiumUpsellDialog
      open={open}
      onOpenChange={onOpenChange}
      imageUrl="/images/premium-upsell.webp"
      title={getTitle(mode)}
      description={m.watermark_upsell_description()}
      secondaryAction={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={exportMutation.isPending}
            onClick={() => {
              exportMutation.mutate()
            }}
            aria-busy={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <LoadingSpinner className="size-4" aria-hidden="true" />
            ) : (
              <ConfirmIcon className="size-4" aria-hidden="true" />
            )}
            {getConfirmLabel(mode)}
          </Button>
          {exportMutation.isPending ? (
            <p role="status" className="sr-only">
              {m.common_loading()}
            </p>
          ) : null}
        </>
      }
    />
  )
}
