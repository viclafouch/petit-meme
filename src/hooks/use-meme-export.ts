import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import { useIsPremium } from '~/hooks/use-is-premium'
import { snoozePremiumReminder } from '~/hooks/use-premium-reminder'
import { useShowDialog } from '~/hooks/use-show-dialog'
import type { InsightsTracking } from '~/lib/algolia-insights'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import {
  deliverMemeExport,
  fetchMemeExport,
  type ExportableMeme
} from '~/utils/meme-export'

type UseMemeExportParams = {
  mode: MemeExportMode
  queryID?: string
}

type MemeExportRequest = {
  meme: ExportableMeme
  format: MemeDerivedFormat
}

export const useMemeExport = ({ mode, queryID }: UseMemeExportParams) => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()
  const isPremium = useIsPremium()
  const tracking = {
    queryID,
    authenticatedUserToken: user?.id
  } satisfies InsightsTracking

  const exportMutation = useMutation({
    mutationFn: async ({ meme, format }: MemeExportRequest) => {
      const blobPromise = fetchMemeExport({ meme, mode, format })

      toast.promise(blobPromise, {
        loading: m.common_loading(),
        error: getErrorMessage
      })

      await deliverMemeExport({
        blob: await blobPromise,
        meme,
        mode,
        format,
        tracking
      })
    },
    onError: (error) => {
      captureWithFeature(error, mode)
    }
  })

  const trigger = (meme: ExportableMeme, format: MemeDerivedFormat) => {
    if (exportMutation.isPending) {
      return
    }

    if (isPremium) {
      exportMutation.mutate({ meme, format })

      return
    }

    snoozePremiumReminder()

    if (format === 'mp3') {
      showDialog('audio-upsell', { meme, mode, tracking })

      return
    }

    showDialog('watermark-upsell', { meme, mode, tracking })
  }

  return {
    trigger,
    isPending: exportMutation.isPending
  }
}
