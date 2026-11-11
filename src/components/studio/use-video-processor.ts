import React from 'react'
import { toast } from 'sonner'
import type { FFmpeg, ProgressEvent } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery
} from '@tanstack/react-query'
import { snoozePremiumReminder } from '~/components/premium/use-premium-reminder'
import { getAppErrorCode, AppError } from '~/constants/error'
import type { MemeWithVideo } from '~/constants/meme'
import { PERCENT_SCALE } from '~/constants/number'
import {
  STUDIO_BASELINE_RATIO,
  STUDIO_DEFAULT_BAND_HEIGHT,
  STUDIO_DEFAULT_FONT_COLOR,
  STUDIO_DEFAULT_FONT_SIZE,
  STUDIO_DEFAULT_MAX_CHARS_PER_LINE,
  STUDIO_FONTS,
  STUDIO_LINE_SPACING,
  type StudioBandColorValue,
  type StudioFontColorValue,
  type StudioFontFamilyId,
  type StudioFontSizeValue,
  type StudioTextPosition
} from '~/constants/studio'
import { buildReachedCapState } from '~/helpers/cap'
import { getErrorMessage } from '~/helpers/error'
import {
  FFMPEG_VIDEO_ENCODING_ARGS,
  FFMPEG_INPUT_FILE,
  FFMPEG_TEXT_FILE,
  loadFFmpeg,
  readAndDeleteFFmpegOutput
} from '~/lib/ffmpeg'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'
import {
  getGenerationQuotaQueryOpts,
  getStudioVideoQueryOpts
} from '~/queries/studio'
import { createGeneration } from '~/server/studio/studio.functions'
import { useDialogStore } from '~/stores/dialog.store'

type VideoProcessingParams = {
  text: string
  bandHeight?: number
  textPosition?: StudioTextPosition
  fontSize?: StudioFontSizeValue
  fontColor?: StudioFontColorValue
  fontFamily?: StudioFontFamilyId
  bandColor?: StudioBandColorValue
  bandOpacity?: number
  maxCharsPerLine?: number
}

type AddTextToVideoParams = {
  videoBlob: Blob
  memeId: string
} & VideoProcessingParams

type ProcessVideoParams = {
  meme: Pick<MemeWithVideo, 'id' | 'title'>
} & VideoProcessingParams

export type ProcessedData = {
  blob: Blob
  url: string
  title: string
}

const wrapText = (text: string, maxLength: number) => {
  const lines: string[] = []

  for (const word of text.split(' ')) {
    const lastLine = lines.at(-1) ?? ''
    const currentLine = lastLine === '' ? word : `${lastLine} ${word}`

    if (lines.length > 0 && currentLine.length <= maxLength) {
      lines[lines.length - 1] = currentLine
    } else {
      lines.push(word)
    }
  }

  return lines.join('\n')
}

const loadedVideoMap = new WeakMap<FFmpeg, string>()

type EnsureVideoFileParams = {
  videoBlob: Blob
  memeId: string
}

const ensureVideoFile = async (
  ffmpeg: FFmpeg,
  { videoBlob, memeId }: EnsureVideoFileParams
) => {
  if (loadedVideoMap.get(ffmpeg) === memeId) {
    return
  }

  await ffmpeg.writeFile(FFMPEG_INPUT_FILE, await fetchFile(videoBlob))
  loadedVideoMap.set(ffmpeg, memeId)
}

const ensureFontFile = async (
  ffmpeg: FFmpeg,
  font: (typeof STUDIO_FONTS)[number]
) => {
  try {
    await ffmpeg.readFile(font.ffmpegFile)
  } catch {
    await ffmpeg.writeFile(font.ffmpegFile, await fetchFile(font.fontPath))
  }
}

type BuildVideoFilterParams = {
  textPosition: StudioTextPosition
  bandHeight: number
  fontSize: number
  fontColor: string
  fontFile: string
  bandColor: string
  bandOpacity: number
  lineCount: number
}

type BuildBandFilterParams = {
  bandOpacity: number
  bandColor: string
  bandHeight: number
  isTopPosition: boolean
}

const buildBandFilter = ({
  bandOpacity,
  bandColor,
  bandHeight,
  isTopPosition
}: BuildBandFilterParams) => {
  if (bandOpacity < 1) {
    const boxY = isTopPosition ? '0' : `ih-${bandHeight}`

    return `drawbox=x=0:y=${boxY}:w=iw:h=${bandHeight}:color=${bandColor}@${bandOpacity}:t=fill`
  }

  if (isTopPosition) {
    return `pad=iw:ih+${bandHeight}:0:${bandHeight}:${bandColor}`
  }

  return `pad=iw:ih+${bandHeight}:0:0:${bandColor}`
}

const buildVideoFilter = ({
  textPosition,
  bandHeight,
  fontSize,
  fontColor,
  fontFile,
  bandColor,
  bandOpacity,
  lineCount
}: BuildVideoFilterParams) => {
  const baselineOffset = Math.floor(fontSize * STUDIO_BASELINE_RATIO)
  const totalTextHeight =
    lineCount * fontSize + (lineCount - 1) * STUDIO_LINE_SPACING
  const isTopPosition = textPosition === 'top'

  const bandFilter = buildBandFilter({
    bandOpacity,
    bandColor,
    bandHeight,
    isTopPosition
  })

  const yPosition = isTopPosition
    ? `${Math.floor(bandHeight / 2)}-${Math.floor(totalTextHeight / 2)}+${baselineOffset}`
    : `h-${Math.floor(bandHeight / 2)}-${Math.floor(totalTextHeight / 2)}+${baselineOffset}`

  return [
    bandFilter,
    `drawtext=fontfile=${fontFile}:textfile=text.txt:x=(w-text_w)/2:y=${yPosition}:fontsize=${fontSize}:fontcolor=${fontColor}:line_spacing=${STUDIO_LINE_SPACING}`
  ].join(',')
}

const buildFFmpegArgs = (videoFilter: string) => {
  return [
    '-i',
    FFMPEG_INPUT_FILE,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-vf',
    videoFilter,
    ...FFMPEG_VIDEO_ENCODING_ARGS
  ]
}

const resolveFont = (fontFamily: StudioFontFamilyId) => {
  const font = STUDIO_FONTS.find((entry) => {
    return entry.id === fontFamily
  })

  if (!font) {
    throw new Error(`Unknown font family: ${fontFamily}`)
  }

  return font
}

const addTextToVideo = async (
  ffmpeg: FFmpeg,
  {
    videoBlob,
    memeId,
    text,
    bandHeight = STUDIO_DEFAULT_BAND_HEIGHT,
    fontSize = STUDIO_DEFAULT_FONT_SIZE,
    textPosition = 'bottom',
    fontColor = STUDIO_DEFAULT_FONT_COLOR,
    fontFamily = 'arial',
    bandColor = 'white',
    bandOpacity = 1,
    maxCharsPerLine = STUDIO_DEFAULT_MAX_CHARS_PER_LINE
  }: AddTextToVideoParams
) => {
  const font = resolveFont(fontFamily)
  const wrappedText = wrapText(text, maxCharsPerLine)

  await Promise.all([
    ensureVideoFile(ffmpeg, { videoBlob, memeId }),
    ensureFontFile(ffmpeg, font),
    ffmpeg.writeFile(FFMPEG_TEXT_FILE, new TextEncoder().encode(wrappedText))
  ])

  const videoFilter = buildVideoFilter({
    textPosition,
    bandHeight,
    fontSize,
    fontColor,
    fontFile: font.ffmpegFile,
    bandColor,
    bandOpacity,
    lineCount: wrappedText.split('\n').length
  })

  const exitCode = await ffmpeg.exec(buildFFmpegArgs(videoFilter))

  if (exitCode !== 0) {
    throw new Error('FFmpeg error')
  }

  const blob = await readAndDeleteFFmpegOutput(ffmpeg)
  await ffmpeg.deleteFile(FFMPEG_TEXT_FILE).catch(() => {})

  return blob
}

const getVideoInitQueryOpts = () => {
  return queryOptions({
    queryKey: [...getVideoInitQueryOpts.all],
    queryFn: () => {
      return loadFFmpeg(m.error_video_timeout())
    },
    staleTime: Infinity
  })
}

getVideoInitQueryOpts.all = ['video-processor-init'] as const

export const useVideoInitializer = () => {
  const queryClient = useQueryClient()
  const videoInitQuery = useSuspenseQuery(getVideoInitQueryOpts())

  React.useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: getVideoInitQueryOpts.all })
    }
  }, [queryClient])

  return videoInitQuery
}

export const useVideoPreloader = (ffmpeg: FFmpeg, memeId: string) => {
  const queryClient = useQueryClient()
  const preloadedMemeIdRef = React.useRef<string | null>(null)

  const preloadAssets = async () => {
    try {
      const defaultFont = resolveFont('arial')

      const [videoBlob] = await Promise.all([
        queryClient.query({
          ...getStudioVideoQueryOpts(memeId),
          staleTime: 'static'
        }),
        ensureFontFile(ffmpeg, defaultFont)
      ])

      await ensureVideoFile(ffmpeg, { videoBlob, memeId })
    } catch {
      preloadedMemeIdRef.current = null
    }
  }

  const triggerPreload = () => {
    if (preloadedMemeIdRef.current === memeId) {
      return
    }

    preloadedMemeIdRef.current = memeId
    void preloadAssets()
  }

  return { triggerPreload }
}

type UseVideoProcessorParams = {
  onMutate?: () => void
  onSuccess?: (blob: Blob) => void
  onError?: (error: Error) => void
}

export const useVideoProcessor = (
  ffmpeg: FFmpeg,
  options?: UseVideoProcessorParams
) => {
  const dialogStore = useDialogStore()
  const [progress, setProgress] = React.useState(0)
  const objectUrlRef = React.useRef<string | null>(null)
  const queryClient = useQueryClient()

  const handleProgress = React.useCallback(
    ({ progress: progressValue }: ProgressEvent) => {
      if (progressValue < 0 || progressValue > 1) {
        return
      }

      setProgress(Math.round(progressValue * PERCENT_SCALE))
    },
    []
  )

  const processVideoMutation = useMutation({
    onMutate: () => {
      ffmpeg.off('progress', handleProgress)
      setProgress(0)
      options?.onMutate?.()
      ffmpeg.on('progress', handleProgress)
    },
    mutationFn: async ({ meme, ...processingOptions }: ProcessVideoParams) => {
      const generationCap = await queryClient.query(
        getGenerationQuotaQueryOpts()
      )

      if (generationCap.isReached) {
        throw new AppError('premium_required', { code: 'PREMIUM_REQUIRED' })
      }

      const videoBlob = await queryClient.query({
        ...getStudioVideoQueryOpts(meme.id),
        staleTime: 'static'
      })
      const blob = await addTextToVideo(ffmpeg, {
        videoBlob,
        memeId: meme.id,
        ...processingOptions
      })

      await createGeneration({ data: { memeId: meme.id } })

      if (objectUrlRef.current !== null) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      return {
        blob,
        url,
        title: meme.title
      }
    },
    onSuccess: ({ blob }) => {
      options?.onSuccess?.(blob)
      void queryClient.invalidateQueries(getGenerationQuotaQueryOpts())
    },
    onError: (error) => {
      const errorCode = getAppErrorCode(error)

      if (errorCode === 'UNAUTHORIZED') {
        dialogStore.actions.showDialog('auth')

        return
      }

      if (errorCode === 'PREMIUM_REQUIRED') {
        queryClient.setQueryData(
          getGenerationQuotaQueryOpts().queryKey,
          buildReachedCapState('generation')
        )
        snoozePremiumReminder()
        dialogStore.actions.showDialog('studio-upsell')

        return
      }

      if (errorCode !== undefined) {
        toast.error(getErrorMessage(error))
        options?.onError?.(error)

        return
      }

      captureWithFeature(error, 'studio')
      toast.error(m.error_generation())
      options?.onError?.(error)
    },
    onSettled: () => {
      ffmpeg.off('progress', handleProgress)
    }
  })

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current !== null) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      ffmpeg.terminate()
    }
  }, [ffmpeg])

  const cancel = () => {
    ffmpeg.terminate()

    processVideoMutation.reset()
    setProgress(0)
    void queryClient.invalidateQueries(getVideoInitQueryOpts())
  }

  const reset = () => {
    if (objectUrlRef.current !== null) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    processVideoMutation.reset()
    setProgress(0)
  }

  return {
    processVideo: processVideoMutation.mutate,
    progress,
    isProcessing: processVideoMutation.isPending,
    error: processVideoMutation.error,
    processedData: processVideoMutation.data ?? null,
    cancel,
    reset
  }
}
