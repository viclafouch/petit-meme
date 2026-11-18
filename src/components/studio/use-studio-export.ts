import React from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useExportFollowUp } from '~/components/meme/use-export-follow-up'
import type {
  CaptionRender,
  RenderedFile
} from '~/components/studio/use-caption-render'
import { getAppErrorCode } from '~/constants/error'
import type { MemeExportMode } from '~/constants/meme'
import {
  downloadBlob,
  matchIsBlobShareable,
  shareBlobOrThrow
} from '~/lib/download'
import { m } from '~/paraglide/messages'
import { getGenerationQuotaQueryOpts } from '~/queries/studio'
import { createGeneration } from '~/server/studio/studio.functions'
import { useDialogStore } from '~/stores/dialog.store'

const COMPLETE_HOLD_MS = 320

const matchIsActivationError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

const wait = (milliseconds: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

type UseStudioExportParams = {
  title: string
  memeId: string
  isSignedIn: boolean
  isQuotaReached: boolean | null
  render: CaptionRender
}

export const useStudioExport = ({
  title,
  memeId,
  isSignedIn,
  isQuotaReached,
  render
}: UseStudioExportParams) => {
  const dialogStore = useDialogStore()
  const queryClient = useQueryClient()
  const followUpExport = useExportFollowUp()
  const [pendingMode, setPendingMode] = React.useState<MemeExportMode | null>(
    null
  )
  const [isCompleting, setIsCompleting] = React.useState(false)
  const [shareKeyAwaitingTap, setShareKeyAwaitingTap] = React.useState<
    string | null
  >(null)
  const { file } = render

  const recordGeneration = async () => {
    await Promise.allSettled([createGeneration({ data: { memeId } })])
    await queryClient.invalidateQueries(getGenerationQuotaQueryOpts())
  }

  const deliver = async (rendered: RenderedFile, mode: MemeExportMode) => {
    if (mode === 'share' && matchIsBlobShareable(rendered.blob, title, 'mp4')) {
      const wasShared = await shareBlobOrThrow(rendered.blob, title, 'mp4')

      if (!wasShared) {
        return
      }
    } else {
      downloadBlob(rendered.blob, `${title}.mp4`)
    }

    void recordGeneration()
    followUpExport()
  }

  const deliverReadyFile = async (
    rendered: RenderedFile,
    mode: MemeExportMode
  ) => {
    try {
      await deliver(rendered, mode)
      setShareKeyAwaitingTap(null)
    } catch (error) {
      if (!matchIsActivationError(error)) {
        toast.error(m.studio_share_failed())
      }
    }
  }

  const deliverAfterRender = async (mode: MemeExportMode) => {
    setPendingMode(mode)

    try {
      const rendered = await render.renderNow()

      setIsCompleting(true)
      await wait(COMPLETE_HOLD_MS)

      try {
        await deliver(rendered, mode)
      } catch (error) {
        if (mode === 'download' || !matchIsActivationError(error)) {
          throw error
        }

        setShareKeyAwaitingTap(rendered.key)
      }
    } catch (error) {
      toast.error(
        getAppErrorCode(error) === 'RATE_LIMITED'
          ? m.studio_rate_limited()
          : m.studio_render_failed()
      )
    } finally {
      setPendingMode(null)
      setIsCompleting(false)
    }
  }

  const deliverOnceQuotaKnown = async (mode: MemeExportMode) => {
    try {
      const quota = await queryClient.query(getGenerationQuotaQueryOpts())

      if (quota.isReached) {
        dialogStore.actions.showDialog('studio-upsell')

        return
      }
    } catch {
      toast.error(m.studio_render_failed())

      return
    }

    await deliverAfterRender(mode)
  }

  const exportVideo = (mode: MemeExportMode) => {
    if (!isSignedIn) {
      dialogStore.actions.showDialog('auth')

      return
    }

    if (isQuotaReached === null) {
      void deliverOnceQuotaKnown(mode)

      return
    }

    if (isQuotaReached) {
      dialogStore.actions.showDialog('studio-upsell')

      return
    }

    if (file === null) {
      void deliverAfterRender(mode)
    } else {
      void deliverReadyFile(file, mode)
    }
  }

  return {
    pendingMode,
    isCompleting,
    isShareAwaitingTap: file !== null && shareKeyAwaitingTap === file.key,
    share: () => {
      exportVideo('share')
    },
    download: () => {
      exportVideo('download')
    }
  }
}
