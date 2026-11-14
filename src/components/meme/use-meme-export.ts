import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useExportFollowUp } from '~/components/meme/use-export-follow-up'
import { useIsPremium } from '~/components/premium/use-is-premium'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import type { InsightsTracking } from '~/lib/algolia-insights'
import { exportMeme, type ExportableMeme } from '~/lib/meme-export'
import { snoozePremiumReminder } from '~/lib/premium-reminder'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'
import { useDialogStore } from '~/stores/dialog.store'

type UseMemeExportParams = {
  mode: MemeExportMode
  queryID?: string
}

type MemeExportRequest = {
  meme: ExportableMeme
  format: MemeDerivedFormat
}

export const useMemeExport = ({ mode, queryID }: UseMemeExportParams) => {
  const dialogStore = useDialogStore()
  const { user } = useRouteContext({ from: '__root__' })
  const isPremium = useIsPremium()
  const followUpExport = useExportFollowUp()
  const tracking = {
    queryID,
    authenticatedUserToken: user?.id
  } satisfies InsightsTracking

  const exportMutation = useMutation({
    mutationFn: ({ meme, format }: MemeExportRequest) => {
      return exportMeme({
        meme,
        mode,
        format,
        tracking,
        onFileRequested: (filePromise) => {
          toast.promise(filePromise, {
            loading: m.common_loading(),
            error: getErrorMessage
          })
        }
      })
    },
    onSuccess: (wasExported) => {
      if (wasExported) {
        followUpExport()
      }
    },
    onError: (error) => {
      captureWithFeature(error, mode)
    }
  })

  const trigger = (meme: ExportableMeme, format: MemeDerivedFormat) => {
    if (exportMutation.isPending) {
      return
    }

    if (format === 'mp3' && !isPremium) {
      snoozePremiumReminder()
      dialogStore.actions.showDialog('audio-upsell', { meme, mode, tracking })

      return
    }

    exportMutation.mutate({ meme, format })
  }

  return {
    trigger,
    isPending: exportMutation.isPending
  }
}
