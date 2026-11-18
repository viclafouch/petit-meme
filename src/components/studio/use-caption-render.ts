import React from 'react'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAppErrorCode } from '~/constants/error'
import {
  STUDIO_RENDER_DEBOUNCE_MS,
  type Caption,
  type StudioPlan
} from '~/constants/studio'
import {
  buildCaptionKey,
  layoutCaption,
  matchHasCaptionText,
  roundToEven
} from '~/helpers/caption'
import { captureWithFeature } from '~/lib/sentry'
import {
  loadCaptionFonts,
  measureCaptionText,
  paintCaptionOverlay
} from '~/lib/studio/caption-canvas'
import {
  matchCanCreateStudioVideo,
  renderStudioVideo,
  StudioRenderCanceledError,
  StudioRenderUnsupportedError
} from '~/lib/studio/studio-export'
import { listenToStudioSourceProgress } from '~/lib/studio/studio-source'
import { getStudioSourceQueryOpts } from '~/queries/studio'

const SOURCE_PHASE_WEIGHT = 0.35
const RATE_LIMITED_PAUSE_MS = 60_000
const FAILED_SOURCE_PAUSE_MS = 15_000
const KEPT_FILE_COUNT = 3

export type RenderedFile = {
  key: string
  blob: Blob
}

type CaptionRenderFailure = 'unsupported' | 'error'

type Job = {
  key: string
  promise: Promise<RenderedFile>
  cancel: () => void
}

type UseCaptionRenderParams = {
  memeId: string
  plan: StudioPlan
  caption: Caption
  isEnabled: boolean
}

export const useCaptionRender = ({
  memeId,
  plan,
  caption,
  isEnabled
}: UseCaptionRenderParams) => {
  const queryClient = useQueryClient()
  const key = buildCaptionKey(caption)
  const hasText = matchHasCaptionText(caption)
  const [debouncedCaption] = useDebouncedValue(caption, {
    wait: STUDIO_RENDER_DEBOUNCE_MS
  })
  const [encodeProgress, setEncodeProgress] = React.useState(0)
  const [sourceProgress, setSourceProgress] = React.useState(0)
  const [renderingKey, setRenderingKey] = React.useState<string | null>(null)
  const [files, setFiles] = React.useState<RenderedFile[]>([])
  const [failure, setFailure] = React.useState<CaptionRenderFailure | null>(
    null
  )
  const [canCreateVideo, setCanCreateVideo] = React.useState(true)
  const jobRef = React.useRef<Job | null>(null)
  const backgroundPausedUntilRef = React.useRef(0)
  const sourceQuery = useQuery({
    ...getStudioSourceQueryOpts(memeId, plan),
    enabled: isEnabled && canCreateVideo && hasText
  })

  React.useEffect(() => {
    let isMounted = true

    const checkVideoSupport = async () => {
      try {
        const isSupported = await matchCanCreateStudioVideo()

        if (isMounted) {
          setCanCreateVideo(isSupported)
        }
      } catch {
        if (isMounted) {
          setCanCreateVideo(false)
        }
      }
    }

    void checkVideoSupport()

    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    return listenToStudioSourceProgress({
      memeId,
      plan,
      listener: setSourceProgress
    })
  }, [memeId, plan])

  const startJob = React.useCallback(
    (nextCaption: Caption) => {
      const nextKey = buildCaptionKey(nextCaption)

      if (jobRef.current?.key === nextKey) {
        return jobRef.current.promise
      }

      jobRef.current?.cancel()

      let cancelRender = () => {}
      let isCanceled = false

      const cancel = () => {
        isCanceled = true
        cancelRender()
      }

      const readSourceOrPauseBackground = async () => {
        try {
          return await queryClient.query(getStudioSourceQueryOpts(memeId, plan))
        } catch (error) {
          backgroundPausedUntilRef.current =
            Date.now() +
            (getAppErrorCode(error) === 'RATE_LIMITED'
              ? RATE_LIMITED_PAUSE_MS
              : FAILED_SOURCE_PAUSE_MS)

          throw error
        }
      }

      const render = async (): Promise<RenderedFile> => {
        setFailure(null)
        setRenderingKey(nextKey)
        setEncodeProgress(0)

        const [source] = await Promise.all([
          readSourceOrPauseBackground(),
          loadCaptionFonts()
        ])

        if (isCanceled) {
          throw new StudioRenderCanceledError()
        }

        const width = roundToEven(source.width)
        const videoHeight = roundToEven(source.height * (width / source.width))
        const layout = layoutCaption({
          caption: nextCaption,
          width,
          videoHeight,
          measureText: measureCaptionText
        })
        const rendering = renderStudioVideo({
          source: source.blob,
          overlay: paintCaptionOverlay({ caption: nextCaption, layout }),
          width,
          videoTop: layout.topBandHeight,
          videoHeight,
          outputHeight: layout.outputHeight,
          onProgress: setEncodeProgress
        })
        cancelRender = rendering.cancel

        return { key: nextKey, blob: await rendering.video }
      }

      const settle = async () => {
        try {
          const file = await render()

          setFiles((previous) => {
            return [...previous.slice(1 - KEPT_FILE_COUNT), file]
          })
          setRenderingKey((current) => {
            return current === nextKey ? null : current
          })

          return file
        } catch (error) {
          if (jobRef.current?.cancel === cancel) {
            jobRef.current = null
          }

          if (error instanceof StudioRenderUnsupportedError) {
            setRenderingKey(null)
            setFailure('unsupported')
          } else if (!(error instanceof StudioRenderCanceledError)) {
            setRenderingKey(null)
            setFailure('error')
            captureWithFeature(error, 'studio')
          }

          throw error
        }
      }

      const promise = settle()

      jobRef.current = { key: nextKey, promise, cancel }

      return promise
    },
    [memeId, plan, queryClient]
  )

  React.useEffect(() => {
    if (
      !isEnabled ||
      !canCreateVideo ||
      !matchHasCaptionText(debouncedCaption) ||
      Date.now() < backgroundPausedUntilRef.current
    ) {
      return
    }

    void Promise.allSettled([startJob(debouncedCaption)])
  }, [debouncedCaption, isEnabled, canCreateVideo, startJob])

  React.useEffect(() => {
    return () => {
      jobRef.current?.cancel()
    }
  }, [])

  const file =
    files.find((candidate) => {
      return candidate.key === key
    }) ?? null
  const isRendering = renderingKey === key
  const isSourceReady = sourceQuery.data !== undefined
  const encodeShare = isRendering ? encodeProgress : 0

  const resolveStatus = () => {
    if (!canCreateVideo) {
      return 'unsupported'
    }

    if (!hasText) {
      return 'idle'
    }

    if (file !== null) {
      return 'ready'
    }

    return failure ?? (isRendering ? 'rendering' : 'waiting')
  }

  return {
    status: resolveStatus(),
    file,
    overallProgress: isSourceReady
      ? SOURCE_PHASE_WEIGHT + encodeShare * (1 - SOURCE_PHASE_WEIGHT)
      : sourceProgress * SOURCE_PHASE_WEIGHT,
    renderNow: () => {
      return startJob(caption)
    }
  }
}

export type CaptionRender = ReturnType<typeof useCaptionRender>
