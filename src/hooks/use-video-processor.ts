import React from 'react'
import { toast } from 'sonner'
import { StudioError, wrapServerFn } from '@/constants/error'
import type { Meme } from '@/db/generated/prisma/client'
import { getErrorMessage } from '@/lib/auth-client'
import { shareMeme } from '@/server/meme'
import { checkGeneration, incrementGenerationCount } from '@/server/user'
import { useShowDialog } from '@/stores/dialog.store'
import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'

type VideoProcessingOptions = {
  text: string
  bandHeight?: number
  textPosition?: 'top' | 'bottom'
  fontSize?: number
  fontColor?: string
  maxCharsPerLine?: number
}

type MutationBody = {
  meme: Meme
} & VideoProcessingOptions

const wrapText = (text: string, maxLength: number): string => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }

      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.join('\n')
}

const addTextToVideo = async (
  ffmpeg: FFmpeg,
  videoBlob: Blob,
  {
    text,
    bandHeight = 100,
    fontSize = 36,
    textPosition = 'bottom',
    fontColor = 'black',
    maxCharsPerLine = 50
  }: VideoProcessingOptions
) => {
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob))
  await ffmpeg.writeFile('arial.ttf', await fetchFile('/fonts/arial.ttf'))
  const wrappedText = wrapText(text, maxCharsPerLine)
  await ffmpeg.writeFile('text.txt', new TextEncoder().encode(wrappedText))

  const lineCount = wrappedText.split('\n').length
  const lineSpacing = 4
  const baselineOffset = Math.floor(fontSize * 0.2)
  const totalTextHeight = lineCount * fontSize + (lineCount - 1) * lineSpacing

  let padFilter = `pad=iw:ih+${bandHeight}:0:0:white`
  let yPosition = `h-${Math.floor(bandHeight / 2)}-${Math.floor(totalTextHeight / 2)}+${baselineOffset}`

  if (textPosition === 'top') {
    padFilter = `pad=iw:ih+${bandHeight}:0:${bandHeight}:white`
    yPosition = `${Math.floor(bandHeight / 2)}-${Math.floor(totalTextHeight / 2)}+${baselineOffset}`
  }

  const result = await ffmpeg.exec([
    '-i',
    'input.mp4',
    '-vf',
    [
      padFilter,
      `drawtext=fontfile=arial.ttf:textfile=text.txt:x=(w-text_w)/2:y=${yPosition}:fontsize=${fontSize}:fontcolor=${fontColor}:line_spacing=${lineSpacing}`
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

  // @ts-ignore
  return new Blob([data as Uint8Array], { type: 'video/mp4' })
}

export const useVideoInitializer = () => {
  const query = useSuspenseQuery({
    queryFn: async () => {
      const ffmpeg = new FFmpeg()

      await ffmpeg.load()

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
  }, [])

  return query
}

export const useVideoProcessor = (
  ffmpeg: FFmpeg,
  options?: {
    onMutate?: () => void
    onSuccess?: (blob: Blob) => void
    onError?: (error: Error) => void
  }
) => {
  const [progress, setProgress] = React.useState(0)
  const showDialog = useShowDialog()

  const progressSubscription = React.useCallback(
    (progressEvent: ProgressEvent) => {
      setProgress(Math.round(progressEvent.progress * 100))
    },
    []
  )

  const mutation = useMutation({
    onMutate: async () => {
      setProgress(0)
      options?.onMutate?.()
      await ffmpeg.load()
      ffmpeg.on('progress', progressSubscription)
    },
    mutationFn: async ({ meme, ...restOptions }: MutationBody) => {
      await wrapServerFn(checkGeneration())
      const response = await shareMeme({ data: meme.id })
      const videoBlob = await response.blob()
      const blob = await addTextToVideo(ffmpeg, videoBlob, restOptions)

      return {
        blob,
        url: URL.createObjectURL(blob),
        title: meme.title
      }
    },
    onSuccess: ({ blob }) => {
      options?.onSuccess?.(blob)
      incrementGenerationCount()
    },
    onError: (error) => {
      if (error instanceof StudioError && error.code === 'UNAUTHORIZED') {
        showDialog('auth', {})

        return
      }

      if (error instanceof StudioError && error.code === 'PREMIUM_REQUIRED') {
        toast.error(getErrorMessage(error, 'fr'))

        return
      }

      options?.onError?.(error)
    },
    onSettled: () => {
      try {
        ffmpeg.terminate()
      } catch (error) {
        console.log(error)
      }
    }
  })

  React.useEffect(() => {
    return () => {
      ffmpeg.terminate()
    }
  }, [])

  return {
    processVideo: mutation.mutate,
    progress,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: () => {
      mutation.reset()
      setProgress(0)
    }
  }
}
