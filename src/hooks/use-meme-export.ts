import { toast } from 'sonner'
import type { MemeWithVideo } from '@/constants/meme'
import { getErrorMessage } from '@/helpers/error'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '@/lib/queries'
import { matchIsUserAdmin } from '@/lib/role'
import { captureWithFeature } from '@/lib/sentry'
import { m } from '@/paraglide/messages.js'
import { shareMeme, trackMemeAction } from '@/server/meme'
import { useShowDialog } from '@/stores/dialog.store'
import { downloadBlob, shareBlob } from '@/utils/download'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export type MemeExportMode = 'download' | 'share'

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

  const mutation = useMutation({
    mutationFn: async (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
      if (!matchIsClientPremium()) {
        showDialog('watermark-upsell', { meme, mode })

        return
      }

      const blobPromise = shareMeme({ data: meme.id }).then((response) => {
        return response.blob()
      })

      toast.promise(blobPromise, {
        loading: m.common_loading(),
        error: getErrorMessage
      })

      const blob = await blobPromise

      if (mode === 'download') {
        downloadBlob(blob, meme.title)
      } else {
        await shareBlob(blob, meme.title)
      }

      void trackMemeAction({ data: { memeId: meme.id, action: mode } })
    },
    onError: (error) => {
      captureWithFeature(error, mode)
    }
  })

  const trigger = (meme: Pick<MemeWithVideo, 'id' | 'title'>) => {
    if (mutation.isPending) {
      return
    }

    mutation.mutate(meme)
  }

  return {
    trigger,
    isPending: mutation.isPending
  }
}
