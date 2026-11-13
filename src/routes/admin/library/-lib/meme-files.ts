import type { ProgressEvent } from '@ffmpeg/ffmpeg'
import { MEME_STORED_FILE_CONTENT_TYPES } from '~/constants/bunny'
import { PERCENT_SCALE } from '~/constants/number'
import { WATERMARK_ASSET_PATH } from '~/constants/watermark'
import type { Meme } from '~/db/generated/prisma/client'
import { loadFFmpeg } from '~/lib/ffmpeg'
import { extractFirstFrame, fetchThumbnailBytes } from '~/lib/first-frame'
import { extractMp3 } from '~/lib/mp3'
import { applyWatermark } from '~/lib/watermark'
import type { PublishStep } from '~/routes/admin/library/-lib/publish-run'
import {
  createMemeFileUploads,
  storeMemeFiles
} from '~/server/admin/meme/meme-file.functions'

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
  thumbnailBytes: number
  handlers: GenerateMemeFilesHandlers
}

const transcode = async ({
  videoBlob,
  watermarkBlob,
  thumbnailBytes,
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

    handlers.onStep('extracting-first-frame')
    const firstFrame = await extractFirstFrame({
      ffmpeg,
      videoBlob,
      maxBytes: thumbnailBytes
    })

    return { mp4, mp3, 'first-frame': firstFrame }
  } finally {
    ffmpeg.terminate()
  }
}

type BuildMemeFilesParams = {
  bunnyId: string
  readOriginal: () => Promise<Blob>
  handlers: GenerateMemeFilesHandlers
}

type MemeFiles = Awaited<ReturnType<typeof transcode>>

export const buildMemeFiles = async ({
  bunnyId,
  readOriginal,
  handlers
}: BuildMemeFilesParams) => {
  const [videoBlob, watermarkBlob, thumbnailBytes] = await Promise.all([
    readOriginal(),
    fetchWatermarkAsset(),
    fetchThumbnailBytes(bunnyId)
  ])

  return transcode({ videoBlob, watermarkBlob, thumbnailBytes, handlers })
}

export const uploadMemeFiles = async (memeId: Meme['id'], files: MemeFiles) => {
  const { uploads } = await createMemeFileUploads({ data: memeId })

  await Promise.all(
    uploads.map(({ file, url }) => {
      return uploadToBlob({
        url,
        contentType: MEME_STORED_FILE_CONTENT_TYPES[file],
        blob: files[file]
      })
    })
  )

  await storeMemeFiles({ data: memeId })
}
