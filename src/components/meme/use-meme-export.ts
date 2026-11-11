import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { snoozePremiumReminder } from '~/components/premium/use-premium-reminder'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import type { InsightsTracking } from '~/lib/algolia-insights'
import {
  deliverMemeExport,
  fetchMemeExport,
  type ExportableMeme
} from '~/lib/meme-export'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { dialogStore } from '~/stores/dialog.store'

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
      dialogStore.actions.showDialog('audio-upsell', { meme, mode, tracking })

      return
    }

    dialogStore.actions.showDialog('watermark-upsell', { meme, mode, tracking })
  }

  return {
    trigger,
    isPending: exportMutation.isPending
  }
}
