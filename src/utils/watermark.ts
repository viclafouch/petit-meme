import {
  WATERMARK_MARGIN_RATIO,
  WATERMARK_MAX_MARGIN,
  WATERMARK_OPACITY,
  WATERMARK_WIDTH_RATIO
} from '~/constants/watermark'
import {
  FFMPEG_ENCODING_ARGS,
  FFMPEG_INPUT_FILE,
  FFMPEG_WATERMARK_FILE,
  readFFmpegOutput
} from '~/utils/ffmpeg'
import type { FFmpeg, LogEvent } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

type ApplyWatermarkParams = {
  ffmpeg: FFmpeg
  videoBlob: Blob
  watermarkBlob: Blob
}

type MediaDimensions = {
  width: number
  height: number
}

const getVideoDimensions = (blob: Blob) => {
  return new Promise<MediaDimensions>((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(blob)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({ width: video.videoWidth, height: video.videoHeight })
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video metadata'))
    }

    video.src = url
  })
}

const getImageDimensions = (blob: Blob) => {
  return new Promise<MediaDimensions>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load watermark image'))
    }

    img.src = url
  })
}

const roundUpToEven = (value: number) => {
  const rounded = Math.round(value)

  return rounded % 2 === 0 ? rounded : rounded + 1
}

type WatermarkFilterParams = {
  video: MediaDimensions
  watermark: MediaDimensions
}

const buildWasmWatermarkFilter = ({
  video,
  watermark
}: WatermarkFilterParams) => {
  const minSide = Math.min(video.width, video.height)
  const targetWidth = roundUpToEven(minSide * WATERMARK_WIDTH_RATIO)
  const targetHeight = roundUpToEven(
    targetWidth * (watermark.height / watermark.width)
  )
  const margin = Math.min(
    Math.round(minSide * WATERMARK_MARGIN_RATIO),
    WATERMARK_MAX_MARGIN
  )
  const posX = video.width - targetWidth - margin
  const posY = video.height - targetHeight - margin

  return [
    `[1:v]scale=${targetWidth}:${targetHeight},format=rgba,colorchannelmixer=aa=${WATERMARK_OPACITY}[wm]`,
    `[0:v][wm]overlay=${posX}:${posY}`
  ].join(';')
}

export const applyWatermark = async ({
  ffmpeg,
  videoBlob,
  watermarkBlob
}: ApplyWatermarkParams) => {
  const [videoDimensions, watermarkDimensions] = await Promise.all([
    getVideoDimensions(videoBlob),
    getImageDimensions(watermarkBlob)
  ])

  const filterComplex = buildWasmWatermarkFilter({
    video: videoDimensions,
    watermark: watermarkDimensions
  })

  await Promise.all([
    fetchFile(videoBlob).then((data) => {
      return ffmpeg.writeFile(FFMPEG_INPUT_FILE, data)
    }),
    fetchFile(watermarkBlob).then((data) => {
      return ffmpeg.writeFile(FFMPEG_WATERMARK_FILE, data)
    })
  ])

  const logs: string[] = []

  const handleLog = ({ message }: LogEvent) => {
    logs.push(message)
  }

  ffmpeg.on('log', handleLog)

  try {
    const exitCode = await ffmpeg.exec([
      '-i',
      FFMPEG_INPUT_FILE,
      '-i',
      FFMPEG_WATERMARK_FILE,
      '-filter_complex',
      filterComplex,
      '-map',
      '0:a:0?',
      ...FFMPEG_ENCODING_ARGS
    ])

    if (exitCode !== 0) {
      const lastLogs = logs.slice(-10).join('\n')
      throw new Error(
        `FFmpeg watermark failed (exit ${exitCode}):\n${lastLogs}`
      )
    }

    return await readFFmpegOutput(ffmpeg)
  } finally {
    ffmpeg.off('log', handleLog)
    await Promise.all([
      ffmpeg.deleteFile(FFMPEG_INPUT_FILE),
      ffmpeg.deleteFile(FFMPEG_WATERMARK_FILE)
    ]).catch(() => {})
  }
}
