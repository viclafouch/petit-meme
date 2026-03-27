import React from 'react'
import { toast } from 'sonner'
import type { FFmpeg, ProgressEvent } from '@ffmpeg/ffmpeg'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WATERMARK_ASSET_PATH } from '~/constants/watermark'
import type { Meme } from '~/db/generated/prisma/client'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import {
  getAdminMemeWatermarkQueryOpts,
  getAdminVideoBlobQueryOpts
} from '~/routes/admin/-lib/queries'
import {
  getWatermarkUploadConfig,
  logWatermarkUpload,
  previewMemeWatermark
} from '~/routes/admin/-server/watermark'
import { loadFFmpeg } from '~/utils/ffmpeg'
import { applyWatermark } from '~/utils/watermark'

export function useMemeWatermark(memeId: Meme['id']) {
  const queryClient = useQueryClient()
  const [progress, setProgress] = React.useState(0)
  const ffmpegRef = React.useRef<FFmpeg | null>(null)
  const previewUrlRef = React.useRef<string | null>(null)
  const [preview, setPreview] = React.useState<{
    url: string
    blob: Blob
    isGenerated: boolean
  } | null>(null)

  const watermarkQuery = useQuery(getAdminMemeWatermarkQueryOpts(memeId))

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setPreview(null)
  }

  const generateMutation = useMutation({
    mutationKey: ['generate-watermark', memeId],
    onMutate: () => {
      revokePreview()
      setProgress(0)
    },
    mutationFn: async () => {
      if (!ffmpegRef.current) {
        ffmpegRef.current = await loadFFmpeg('FFmpeg loading timeout')
      }

      const ffmpeg = ffmpegRef.current

      const handleProgress = ({ progress: progressValue }: ProgressEvent) => {
        if (progressValue >= 0 && progressValue <= 1) {
          setProgress(Math.round(progressValue * 100))
        }
      }

      ffmpeg.on('progress', handleProgress)

      try {
        const [videoBlob, watermarkResponse] = await Promise.all([
          queryClient.ensureQueryData(getAdminVideoBlobQueryOpts(memeId)),
          fetch(WATERMARK_ASSET_PATH)
        ])

        if (!watermarkResponse.ok) {
          throw new Error(
            `Failed to fetch watermark asset (${watermarkResponse.status})`
          )
        }

        const watermarkBlob = await watermarkResponse.blob()

        return await applyWatermark({ ffmpeg, videoBlob, watermarkBlob })
      } finally {
        ffmpeg.off('progress', handleProgress)
      }
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreview({ url, blob, isGenerated: true })
    },
    onError: (error) => {
      ffmpegRef.current?.terminate()
      ffmpegRef.current = null
      captureWithFeature(error, 'admin-watermark')
      toast.error(getErrorMessage(error))
    }
  })

  const uploadMutation = useMutation({
    mutationKey: ['upload-watermark', memeId],
    mutationFn: async () => {
      if (!preview) {
        throw new Error('No watermark to upload')
      }

      const config = await getWatermarkUploadConfig({ data: memeId })

      const uploadResponse = await fetch(config.url, {
        method: 'PUT',
        headers: {
          AccessKey: config.accessKey,
          'Content-Type': 'application/octet-stream'
        },
        body: preview.blob,
        signal: AbortSignal.timeout(120_000)
      })

      if (!uploadResponse.ok) {
        throw new Error(
          `Bunny Storage upload failed (${uploadResponse.status})`
        )
      }

      await logWatermarkUpload({
        data: { memeId, bunnyId: config.bunnyId }
      })
    },
    onSuccess: () => {
      revokePreview()
      void queryClient.invalidateQueries(getAdminMemeWatermarkQueryOpts(memeId))
      toast.success('Watermark uploadé')
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-watermark')
      toast.error(getErrorMessage(error))
    }
  })

  const fetchExistingMutation = useMutation({
    mutationKey: ['fetch-existing-watermark', memeId],
    onMutate: () => {
      revokePreview()
    },
    mutationFn: async () => {
      const response = await previewMemeWatermark({ data: memeId })

      return response.blob()
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreview({ url, blob, isGenerated: false })
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-watermark')
      toast.error(getErrorMessage(error))
    }
  })

  React.useEffect(() => {
    return () => {
      ffmpegRef.current?.terminate()
      ffmpegRef.current = null

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  return {
    watermarkExists: watermarkQuery.data?.exists ?? false,
    isChecking: watermarkQuery.isPending,
    generate: generateMutation.mutate,
    upload: uploadMutation.mutate,
    fetchExisting: fetchExistingMutation.mutate,
    isFetchingExisting: fetchExistingMutation.isPending,
    dismissPreview: revokePreview,
    progress,
    isGenerating: generateMutation.isPending,
    isUploading: uploadMutation.isPending,
    previewUrl: preview?.url ?? null,
    isPreviewGenerated: preview?.isGenerated ?? false
  }
}
