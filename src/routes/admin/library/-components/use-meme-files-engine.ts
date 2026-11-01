import React from 'react'
import { toast } from 'sonner'
import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PERCENT_SCALE } from '~/constants/number'
import { WATERMARK_ASSET_PATH } from '~/constants/watermark'
import type { Meme } from '~/db/generated/prisma/client'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import {
  getAdminMemeFilesQueryOpts,
  getAdminVideoBlobQueryOpts
} from '~/routes/admin/-lib/queries'
import {
  getMemeFilesUploadConfig,
  logMemeFilesUpload
} from '~/routes/admin/-server/meme-files'
import { loadFFmpeg } from '~/utils/ffmpeg'
import { extractMp3 } from '~/utils/mp3'
import { applyWatermark } from '~/utils/watermark'

export type MemeFilesStep =
  | 'preparing'
  | 'watermarking'
  | 'extracting-mp3'
  | 'uploading'

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

export function useMemeFilesEngine(memeId: Meme['id']) {
  const queryClient = useQueryClient()
  const [step, setStep] = React.useState<MemeFilesStep | null>(null)
  const [progress, setProgress] = React.useState<number | null>(null)
  const filesQuery = useQuery(getAdminMemeFilesQueryOpts(memeId))

  const startStep = (nextStep: MemeFilesStep) => {
    setStep(nextStep)
    setProgress(null)
  }

  const handleProgress = ({ progress: progressValue }: ProgressEvent) => {
    if (progressValue >= 0 && progressValue <= 1) {
      setProgress(Math.round(progressValue * PERCENT_SCALE))
    }
  }

  const transcode = async (videoBlob: Blob, watermarkBlob: Blob) => {
    const ffmpeg = await loadFFmpeg('FFmpeg loading timeout')
    ffmpeg.on('progress', handleProgress)

    try {
      startStep('watermarking')
      const mp4 = await applyWatermark({ ffmpeg, videoBlob, watermarkBlob })

      startStep('extracting-mp3')
      const mp3 = await extractMp3({ ffmpeg, videoBlob })

      return { mp4, mp3 }
    } finally {
      ffmpeg.terminate()
    }
  }

  const generateMutation = useMutation({
    mutationKey: ['generate-meme-files', memeId],
    onMutate: () => {
      startStep('preparing')
    },
    mutationFn: async () => {
      const [videoBlob, watermarkBlob] = await Promise.all([
        queryClient.query({
          ...getAdminVideoBlobQueryOpts(memeId),
          staleTime: 'static'
        }),
        fetchWatermarkAsset()
      ])

      const { mp4, mp3 } = await transcode(videoBlob, watermarkBlob)

      startStep('uploading')
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
      toast.error(getErrorMessage(error))
    },
    onSettled: () => {
      setStep(null)

      return queryClient.invalidateQueries(getAdminMemeFilesQueryOpts(memeId))
    }
  })

  return {
    missingFiles: filesQuery.data?.missingFiles,
    isChecking: filesQuery.isPending,
    generate: generateMutation.mutate,
    generateAsync: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    step,
    progress
  }
}

export type MemeFilesEngine = ReturnType<typeof useMemeFilesEngine>
