import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import { snoozePremiumReminder } from '~/hooks/use-premium-reminder'
import { useShowDialog } from '~/hooks/use-show-dialog'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '~/lib/queries'
import { matchIsUserAdmin } from '~/lib/role'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { shareMeme, trackMemeAction } from '~/server/meme'
import { downloadBlob, shareBlob } from '~/utils/download'

type UseMemeExportParams = {
  mode: MemeExportMode
}

export const useMemeExport = ({ mode }: UseMemeExportParams) => {
  const queryClient = useQueryClient()
  const showDialog = useShowDialog()

  const matchIsClientPremium = () => {
    const user = queryClient.getQueryData(getAuthUserQueryOpts().queryKey)

    if (!user) {
      return false
    }

    if (matchIsUserAdmin(user)) {
      return true
    }

    const subscription = queryClient.getQueryData(
      getActiveSubscriptionQueryOpts().queryKey
    )

    return Boolean(subscription)
  }

  const exportMutation = useMutation({
    mutationFn: async (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
      if (!matchIsClientPremium()) {
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
