import React from 'react'
import { toast } from 'sonner'
import { StudioError } from '@/constants/error'
import type { MemeWithVideo } from '@/constants/meme'
import {
  FFMPEG_CORE_URL,
  FFMPEG_FONT_FILE,
  FFMPEG_FONT_PATH,
  FFMPEG_WASM_URL,
  STUDIO_BASELINE_RATIO,
  STUDIO_DEFAULT_BAND_HEIGHT,
  STUDIO_DEFAULT_FONT_COLOR,
  STUDIO_DEFAULT_FONT_SIZE,
  STUDIO_DEFAULT_MAX_CHARS_PER_LINE,
  STUDIO_LINE_SPACING
} from '@/constants/studio'
import { getVideoBlobQueryOpts } from '@/lib/queries'
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
  textPosition?: 'top' | 'bottom'
  fontSize?: number
  fontColor?: string
  maxCharsPerLine?: number
}

type AddTextToVideoParams = {
  videoBlob: Blob
} & VideoProcessingParams

type ProcessVideoParams = {
  meme: Pick<MemeWithVideo, 'id' | 'title'>
} & VideoProcessingParams

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

const addTextToVideo = async (
  ffmpeg: FFmpeg,
  {
    videoBlob,
    text,
    bandHeight = STUDIO_DEFAULT_BAND_HEIGHT,
    fontSize = STUDIO_DEFAULT_FONT_SIZE,
    textPosition = 'bottom',
    fontColor = STUDIO_DEFAULT_FONT_COLOR,
    maxCharsPerLine = STUDIO_DEFAULT_MAX_CHARS_PER_LINE
  }: AddTextToVideoParams
) => {
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob))

  try {
    await ffmpeg.readFile(FFMPEG_FONT_FILE)
  } catch {
    await ffmpeg.writeFile(FFMPEG_FONT_FILE, await fetchFile(FFMPEG_FONT_PATH))
  }

  const wrappedText = wrapText(text, maxCharsPerLine)
  await ffmpeg.writeFile('text.txt', new TextEncoder().encode(wrappedText))

  const lineCount = wrappedText.split('\n').length
  const baselineOffset = Math.floor(fontSize * STUDIO_BASELINE_RATIO)
  const totalTextHeight =
    lineCount * fontSize + (lineCount - 1) * STUDIO_LINE_SPACING

  const isTop = textPosition === 'top'

  const padFilter = isTop
    ? `pad=iw:ih+${bandHeight}:0:${bandHeight}:white`
    : `pad=iw:ih+${bandHeight}:0:0:white`

  const yPosition = isTop
    ? `${Math.floor(bandHeight / 2)}-${Math.floor(totalTextHeight / 2)}+${baselineOffset}`
    : `h-${Math.floor(bandHeight / 2)}-${Math.floor(totalTextHeight / 2)}+${baselineOffset}`

  const result = await ffmpeg.exec([
    '-i',
    'input.mp4',
    '-vf',
    [
      padFilter,
      `drawtext=fontfile=${FFMPEG_FONT_FILE}:textfile=text.txt:x=(w-text_w)/2:y=${yPosition}:fontsize=${fontSize}:fontcolor=${fontColor}:line_spacing=${STUDIO_LINE_SPACING}`
    ].join(','),
    '-c:a',
    'copy',
    '-preset',
    'ultrafast',
    '-crf',
    '20',
    '-y',
    'output.mp4'
  ])

  if (result !== 0) {
    throw new Error('FFmpeg error')
  }

  const data = await ffmpeg.readFile('output.mp4')

  await Promise.all([
    ffmpeg.deleteFile('input.mp4'),
    ffmpeg.deleteFile('text.txt'),
    ffmpeg.deleteFile('output.mp4')
  ]).catch(() => {})

  if (!(data instanceof Uint8Array)) {
    throw new Error('Unexpected FFmpeg output format')
  }

  return new Blob([new Uint8Array(data).buffer as ArrayBuffer], {
    type: 'video/mp4'
  })
}

export const useVideoInitializer = () => {
  const query = useSuspenseQuery({
    queryFn: async () => {
      const ffmpeg = new FFmpeg()

      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(FFMPEG_CORE_URL, 'text/javascript'),
        toBlobURL(FFMPEG_WASM_URL, 'application/wasm')
      ])

      await ffmpeg.load({ coreURL, wasmURL })

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
      setProgress(Math.round(progressValue * 100))
    },
    []
  )

  const mutation = useMutation({
    onMutate: () => {
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
      void incrementGenerationCount()
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

  return {
    processVideo: mutation.mutate,
    progress,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    cancel,
    reset: () => {
      mutation.reset()
      setProgress(0)
    }
  }
}
