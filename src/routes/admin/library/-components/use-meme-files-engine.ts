import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MEME_DERIVED_FORMAT_CONTENT_TYPES } from '~/constants/bunny'
import { PERCENT_SCALE } from '~/constants/number'
import { WATERMARK_ASSET_PATH } from '~/constants/watermark'
import type { Meme } from '~/db/generated/prisma/client'
import { captureWithFeature } from '~/lib/sentry'
import {
  getAdminMemeFilesQueryOpts,
  getAdminVideoBlobQueryOpts
} from '~/routes/admin/-lib/queries'
import {
  getMemeFilesUploadConfig,
  storeMemeFiles
} from '~/routes/admin/-server/meme-files'
import type { PublishStep } from '~/routes/admin/library/-lib/publish-run'
import { loadFFmpeg } from '~/utils/ffmpeg'
import { extractMp3 } from '~/utils/mp3'
import { applyWatermark } from '~/utils/watermark'

export type GenerateMemeFilesHandlers = {
  onStep: (step: Exclude<PublishStep, 'saving'>) => void
  onProgress: (progress: number) => void
}

type UploadToBlobParams = {
  url: string
  contentType: string
  blob: Blob
}

const BLOB_UPLOAD_TIMEOUT_MS = 120_000

const fetchWatermarkAsset = async () => {
  const response = await fetch(WATERMARK_ASSET_PATH)

  if (!response.ok) {
    throw new Error(`Failed to fetch watermark asset (${response.status})`)
  }

  return response.blob()
}

const uploadToBlob = async ({ url, contentType, blob }: UploadToBlobParams) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
    signal: AbortSignal.timeout(BLOB_UPLOAD_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`Vercel Blob upload failed (${response.status})`)
  }
}

type TranscodeParams = {
  videoBlob: Blob
  watermarkBlob: Blob
  handlers: GenerateMemeFilesHandlers
}

const transcode = async ({
  videoBlob,
  watermarkBlob,
  handlers
}: TranscodeParams) => {
  const ffmpeg = await loadFFmpeg('FFmpeg loading timeout')
  ffmpeg.on('progress', ({ progress }: ProgressEvent) => {
    if (progress >= 0 && progress <= 1) {
      handlers.onProgress(Math.round(progress * PERCENT_SCALE))
    }
  })

  try {
    handlers.onStep('watermarking')
    const mp4 = await applyWatermark({ ffmpeg, videoBlob, watermarkBlob })

    handlers.onStep('extracting-mp3')
    const mp3 = await extractMp3({ ffmpeg, videoBlob })

    return { mp4, mp3 }
  } finally {
    ffmpeg.terminate()
  }
}

export function useMemeFilesEngine(memeId: Meme['id']) {
  const queryClient = useQueryClient()
  const filesQuery = useQuery(getAdminMemeFilesQueryOpts(memeId))

  const generateMutation = useMutation({
    mutationKey: ['generate-meme-files', memeId],
    mutationFn: async (handlers: GenerateMemeFilesHandlers) => {
      handlers.onStep('preparing')

      const [videoBlob, watermarkBlob] = await Promise.all([
        queryClient.query({
          ...getAdminVideoBlobQueryOpts(memeId),
          staleTime: 'static'
        }),
        fetchWatermarkAsset()
      ])

      const { mp4, mp3 } = await transcode({
        videoBlob,
        watermarkBlob,
        handlers
      })

      handlers.onStep('uploading')
      const files = { mp4, mp3 }
      const { uploads } = await getMemeFilesUploadConfig({ data: memeId })

      await Promise.all(
        uploads.map(({ format, url }) => {
          return uploadToBlob({
            url,
            contentType: MEME_DERIVED_FORMAT_CONTENT_TYPES[format],
            blob: files[format]
          })
        })
      )

      await storeMemeFiles({ data: memeId })
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-files')
    },
    onSettled: () => {
      return queryClient.invalidateQueries(getAdminMemeFilesQueryOpts(memeId))
    }
  })

  return {
    missingFiles: filesQuery.data?.missingFiles,
    generateFiles: generateMutation.mutateAsync
  }
}
