import React from 'react'
import { Download, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { LoadingSpinner } from '~/components/ui/spinner'
import type { MemeExportMode } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import type { InsightsTracking } from '~/lib/algolia-insights'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import {
  deliverMemeExport,
  fetchMemeExport,
  type ExportableMeme
} from '~/utils/meme-export'

type WatermarkedVideoButtonProps = {
  meme: ExportableMeme
  mode: MemeExportMode
  tracking: InsightsTracking
  label: string
  onExported: () => void
}

const MODE_ICONS = {
  download: Download,
  share: Share2
} as const satisfies Record<MemeExportMode, React.ElementType>

export const WatermarkedVideoButton = ({
  meme,
  mode,
  tracking,
  label,
  onExported
}: WatermarkedVideoButtonProps) => {
  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await fetchMemeExport({ meme, mode, format: 'mp4' })

      return deliverMemeExport({
        blob,
        meme,
        mode,
        format: 'mp4',
        tracking
      })
    },
    onSuccess: (wasExported) => {
      if (wasExported) {
        onExported()
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
      captureWithFeature(error, mode)
    }
  })

  const ModeIcon = MODE_ICONS[mode]

  return (
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
          <ModeIcon className="size-4" aria-hidden="true" />
        )}
        {label}
      </Button>
      {exportMutation.isPending ? (
        <output className="sr-only">{m.common_loading()}</output>
      ) : null}
    </>
  )
}
