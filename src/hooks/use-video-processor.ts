import React from 'react'
import { toast } from 'sonner'
import { StudioError } from '@/constants/error'
import { FFMPEG_CORE_URL, FFMPEG_WASM_URL } from '@/constants/ffmpeg'
import type { MemeWithVideo } from '@/constants/meme'
import type {
  StudioBandColorValue,
  StudioFontColorValue,
  StudioFontFamilyId,
  StudioFontSizeValue,
  StudioTextPosition
} from '@/constants/studio'
import {
  STUDIO_BASELINE_RATIO,
  STUDIO_DEFAULT_BAND_HEIGHT,
  STUDIO_DEFAULT_FONT_COLOR,
  STUDIO_DEFAULT_FONT_SIZE,
  STUDIO_DEFAULT_MAX_CHARS_PER_LINE,
  STUDIO_FONTS,
  STUDIO_LINE_SPACING
} from '@/constants/studio'
import { withTimeout } from '@/helpers/promise'
import { getAuthUserQueryOpts, getVideoBlobQueryOpts } from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import { incrementGenerationCount } from '@/server/user'
import { useShowDialog } from '@/stores/dialog.store'
import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery
} from '@tanstack/react-query'

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
  return text
    .split(' ')
    .reduce<string[]>((lines, word) => {
      const lastLine = lines.at(-1) ?? ''
      const currentLine = lastLine ? `${lastLine} ${word}` : word

      if (currentLine.length <= maxLength) {
        return [...lines.slice(0, -1), currentLine]
      }

      return [...lines, word]
    }, [])
    .join('\n')
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

  await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob))
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
    'input.mp4',
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-vf',
    videoFilter,
    '-c:v',
    'libx264',
    '-c:a',
    'copy',
    '-preset',
    'ultrafast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-threads',
    '1',
    '-map_metadata',
    '-1',
    '-y',
    'output.mp4'
  ]
}

const readFFmpegOutput = async (ffmpeg: FFmpeg) => {
  const outputData = await ffmpeg.readFile('output.mp4')

  await Promise.all([
    ffmpeg.deleteFile('text.txt'),
    ffmpeg.deleteFile('output.mp4')
  ]).catch(() => {})

  if (!(outputData instanceof Uint8Array)) {
    throw new Error('Unexpected FFmpeg output format')
  }

  return new Blob([new Uint8Array(outputData).buffer as ArrayBuffer], {
    type: 'video/mp4'
  })
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

  await ensureVideoFile(ffmpeg, { videoBlob, memeId })
  await ensureFontFile(ffmpeg, font)

  const wrappedText = wrapText(text, maxCharsPerLine)
  await ffmpeg.writeFile('text.txt', new TextEncoder().encode(wrappedText))

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

  return readFFmpegOutput(ffmpeg)
}

export const useVideoInitializer = () => {
  const query = useSuspenseQuery({
    queryFn: async () => {
      const ffmpeg = new FFmpeg()

      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(FFMPEG_CORE_URL, 'text/javascript'),
        toBlobURL(FFMPEG_WASM_URL, 'application/wasm')
      ])

      await withTimeout(
        ffmpeg.load({ coreURL, wasmURL }),
        30_000,
        'Le chargement du moteur vidéo a pris trop de temps. Vérifiez votre connexion ou votre navigateur.'
      )

      return ffmpeg
    },
    queryKey: ['video-processor-init'],
    staleTime: Infinity,
    refetchOnMount: 'always'
  })

  React.useEffect(() => {
    return () => {
      query.data.terminate()
    }
  }, [query.data])

  return query
}

export const useVideoPreloader = (ffmpeg: FFmpeg, memeId: string) => {
  const queryClient = useQueryClient()
  const hasTriggeredRef = React.useRef(false)

  React.useEffect(() => {
    hasTriggeredRef.current = false
  }, [memeId])

  const preloadAssets = async () => {
    try {
      const defaultFont = resolveFont('arial')

      const [videoBlob] = await Promise.all([
        queryClient.ensureQueryData(getVideoBlobQueryOpts(memeId)),
        ensureFontFile(ffmpeg, defaultFont)
      ])

      await ensureVideoFile(ffmpeg, { videoBlob, memeId })
    } catch {}
  }

  const triggerPreload = () => {
    if (hasTriggeredRef.current) {
      return
    }

    hasTriggeredRef.current = true
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
  const [progress, setProgress] = React.useState(0)
  const objectUrlRef = React.useRef<string | null>(null)
  const showDialog = useShowDialog()
  const queryClient = useQueryClient()

  // eslint-disable-next-line no-restricted-syntax -- referential stability required for ffmpeg.on/off event listener pairing
  const handleProgress = React.useCallback(
    ({ progress: progressValue }: ProgressEvent) => {
      if (progressValue < 0 || progressValue > 1) {
        return
      }

      setProgress(Math.round(progressValue * 100))
    },
    []
  )

  const mutation = useMutation({
    onMutate: () => {
      ffmpeg.off('progress', handleProgress)
      setProgress(0)
      options?.onMutate?.()
      ffmpeg.on('progress', handleProgress)
    },
    mutationFn: async ({ meme, ...processingOptions }: ProcessVideoParams) => {
      const videoBlob = await queryClient.ensureQueryData(
        getVideoBlobQueryOpts(meme.id)
      )
      const blob = await addTextToVideo(ffmpeg, {
        videoBlob,
        memeId: meme.id,
        ...processingOptions
      })

      if (objectUrlRef.current) {
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
      const user = queryClient.getQueryData(getAuthUserQueryOpts().queryKey)

      if (user) {
        void incrementGenerationCount()
      }
    },
    onError: (error) => {
      if (error instanceof StudioError) {
        if (error.code === 'UNAUTHORIZED') {
          showDialog('auth', {})

          return
        }

        if (error.code === 'PREMIUM_REQUIRED') {
          toast.error(error.message)

          return
        }
      }

      captureWithFeature(error, 'studio')
      toast.error('Une erreur est survenue lors de la génération')
      options?.onError?.(error)
    },
    onSettled: () => {
      ffmpeg.off('progress', handleProgress)
    }
  })

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      try {
        ffmpeg.terminate()
      } catch {}
    }
  }, [ffmpeg])

  const cancel = () => {
    try {
      ffmpeg.terminate()
    } catch {}

    mutation.reset()
    setProgress(0)
    void queryClient.invalidateQueries({
      queryKey: ['video-processor-init']
    })
  }

  const reset = () => {
    mutation.reset()
    setProgress(0)
  }

  return {
    processVideo: mutation.mutate,
    progress,
    isProcessing: mutation.isPending,
    error: mutation.error,
    processedData: mutation.data ?? null,
    cancel,
    reset
  }
}
