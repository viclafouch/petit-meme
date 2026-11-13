import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import {
  MEME_FIRST_FRAME_FILE_NAME,
  MEME_STORED_FILE_CONTENT_TYPES
} from '~/constants/bunny'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { FFMPEG_INPUT_FILE } from '~/lib/ffmpeg'

const FIRST_FRAME_QUALITY = {
  best: 75,
  high: 60,
  medium: 45,
  low: 30
} as const

const FIRST_FRAME_QUALITIES = [
  FIRST_FRAME_QUALITY.best,
  FIRST_FRAME_QUALITY.high,
  FIRST_FRAME_QUALITY.medium,
  FIRST_FRAME_QUALITY.low
] as const

type FirstFrameQuality = (typeof FIRST_FRAME_QUALITIES)[number]

type EncodeFirstFrameWithinBudgetParams = {
  encode: (quality: FirstFrameQuality) => Promise<Uint8Array>
  maxBytes: number
}

export const encodeFirstFrameWithinBudget = async ({
  encode,
  maxBytes
}: EncodeFirstFrameWithinBudgetParams) => {
  const encodeFrom = async (
    quality: FirstFrameQuality,
    lowerQualities: readonly FirstFrameQuality[]
  ): Promise<Uint8Array> => {
    const image = await encode(quality)
    const [nextQuality, ...remainingQualities] = lowerQualities

    if (image.byteLength <= maxBytes || nextQuality === undefined) {
      return image
    }

    return encodeFrom(nextQuality, remainingQualities)
  }

  const [bestQuality, ...lowerQualities] = FIRST_FRAME_QUALITIES

  return encodeFrom(bestQuality, lowerQualities)
}

const buildFirstFrameArgs = (quality: FirstFrameQuality) => {
  return [
    '-i',
    FFMPEG_INPUT_FILE,
    '-frames:v',
    '1',
    '-c:v',
    'libwebp',
    '-quality',
    String(quality),
    '-map_metadata',
    '-1',
    '-y',
    MEME_FIRST_FRAME_FILE_NAME
  ]
}

export const fetchThumbnailBytes = async (bunnyId: string) => {
  const response = await fetch(buildVideoImageUrl(bunnyId), { method: 'HEAD' })
  const thumbnailBytes = Number(response.headers.get('Content-Length'))

  if (!response.ok || !thumbnailBytes) {
    throw new Error(
      `The thumbnail of ${bunnyId} answered ${response.status} without its weight`
    )
  }

  return thumbnailBytes
}

type ExtractFirstFrameParams = {
  ffmpeg: FFmpeg
  videoBlob: Blob
  maxBytes: number
}

export const extractFirstFrame = async ({
  ffmpeg,
  videoBlob,
  maxBytes
}: ExtractFirstFrameParams) => {
  await ffmpeg.writeFile(FFMPEG_INPUT_FILE, await fetchFile(videoBlob))

  try {
    const image = await encodeFirstFrameWithinBudget({
      encode: async (quality) => {
        const exitCode = await ffmpeg.exec(buildFirstFrameArgs(quality))

        if (exitCode !== 0) {
          throw new Error(
            `FFmpeg first frame extraction failed (exit ${exitCode})`
          )
        }

        const imageData = await ffmpeg.readFile(MEME_FIRST_FRAME_FILE_NAME)

        if (!(imageData instanceof globalThis.Uint8Array)) {
          throw new TypeError('Unexpected FFmpeg output format')
        }

        return imageData
      },
      maxBytes
    })

    return new Blob([new Uint8Array(image)], {
      type: MEME_STORED_FILE_CONTENT_TYPES['first-frame']
    })
  } finally {
    await Promise.all([
      ffmpeg.deleteFile(FFMPEG_INPUT_FILE),
      ffmpeg.deleteFile(MEME_FIRST_FRAME_FILE_NAME)
    ]).catch(() => {})
  }
}
