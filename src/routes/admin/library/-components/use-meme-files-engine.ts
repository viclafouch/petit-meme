import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  logMemeFilesUpload
} from '~/routes/admin/-server/meme-files'
import type { PublishStep } from '~/routes/admin/library/-lib/publish-run'
import { loadFFmpeg } from '~/utils/ffmpeg'
import { extractMp3 } from '~/utils/mp3'
import { applyWatermark } from '~/utils/watermark'

export type GenerateMemeFilesHandlers = {
  onStep: (step: Exclude<PublishStep, 'saving'>) => void
  onProgress: (progress: number) => void
}

type UploadToStorageParams = {
  url: string
  accessKey: string
  blob: Blob
}

const STORAGE_UPLOAD_TIMEOUT_MS = 120_000

const fetchWatermarkAsset = async () => {
  const response = await fetch(WATERMARK_ASSET_PATH)

  if (!response.ok) {
    throw new Error(`Failed to fetch watermark asset (${response.status})`)
  }

  return response.blob()
}

const uploadToStorage = async ({
  url,
  accessKey,
  blob
}: UploadToStorageParams) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': 'application/octet-stream'
    },
    body: blob,
    signal: AbortSignal.timeout(STORAGE_UPLOAD_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`Bunny Storage upload failed (${response.status})`)
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
      const { bunnyId, urls, accessKey } = await getMemeFilesUploadConfig({
        data: memeId
      })

      await Promise.all([
        uploadToStorage({ url: urls.mp4, accessKey, blob: mp4 }),
        uploadToStorage({ url: urls.mp3, accessKey, blob: mp3 })
      ])

      await logMemeFilesUpload({ data: { memeId, bunnyId } })
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
