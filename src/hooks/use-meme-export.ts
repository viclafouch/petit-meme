import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import { useIsPremium } from '~/hooks/use-is-premium'
import { snoozePremiumReminder } from '~/hooks/use-premium-reminder'
import { useShowDialog } from '~/hooks/use-show-dialog'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { shareMeme, trackMemeAction } from '~/server/meme'
import { downloadBlob, shareBlob } from '~/utils/download'

type UseMemeExportParams = {
  mode: MemeExportMode
}

export const useMemeExport = ({ mode }: UseMemeExportParams) => {
  const showDialog = useShowDialog()
  const isPremium = useIsPremium()

  const exportMutation = useMutation({
    mutationFn: async (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
      if (!isPremium) {
        snoozePremiumReminder()
        showDialog('watermark-upsell', { meme, mode })

        return
      }

      const fetchMemeBlob = async () => {
        const response = await shareMeme({
          data: { memeId: meme.id, mode }
        })

        return response.blob()
      }

      const blobPromise = fetchMemeBlob()

      toast.promise(blobPromise, {
        loading: m.common_loading(),
        error: getErrorMessage
      })

      const blob = await blobPromise

      if (mode === 'download') {
        downloadBlob(blob, meme.title)
        void trackMemeAction({ data: { memeId: meme.id, action: mode } })

        return
      }

      const wasShared = await shareBlob(blob, meme.title)

      if (wasShared) {
        void trackMemeAction({ data: { memeId: meme.id, action: mode } })
      }
    },
    onError: (error) => {
      captureWithFeature(error, mode)
    }
  })

  const trigger = (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
    if (exportMutation.isPending) {
      return
    }

    exportMutation.mutate(meme)
  }

  return {
    trigger,
    isPending: exportMutation.isPending
  }
}
