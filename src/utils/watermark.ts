import { WATERMARK_FFMPEG_FILTER } from '@/constants/watermark'
import {
  FFMPEG_ENCODING_ARGS,
  FFMPEG_INPUT_FILE,
  FFMPEG_WATERMARK_FILE,
  readFFmpegOutput
} from '@/utils/ffmpeg'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

type ApplyWatermarkParams = {
  ffmpeg: FFmpeg
  videoBlob: Blob
  watermarkBlob: Blob
}

/**
 * Apply the watermark overlay to a video using ffmpeg WASM.
 * Writes input files to the ffmpeg virtual filesystem, runs the filter_complex,
 * and returns the watermarked video as a Blob. Cleans up all temp files after.
 */
export const applyWatermark = async ({
  ffmpeg,
  videoBlob,
  watermarkBlob
}: ApplyWatermarkParams) => {
  await Promise.all([
    fetchFile(videoBlob).then((data) => {
      return ffmpeg.writeFile(FFMPEG_INPUT_FILE, data)
    }),
    fetchFile(watermarkBlob).then((data) => {
      return ffmpeg.writeFile(FFMPEG_WATERMARK_FILE, data)
    })
  ])

  try {
    const exitCode = await ffmpeg.exec([
      '-i',
      FFMPEG_INPUT_FILE,
      '-i',
      FFMPEG_WATERMARK_FILE,
      '-filter_complex',
      WATERMARK_FFMPEG_FILTER,
      '-map',
      '0:a:0?',
      ...FFMPEG_ENCODING_ARGS
    ])

    if (exitCode !== 0) {
      throw new Error('FFmpeg watermark failed')
    }

    return await readFFmpegOutput(ffmpeg)
  } finally {
    await Promise.all([
      ffmpeg.deleteFile(FFMPEG_INPUT_FILE),
      ffmpeg.deleteFile(FFMPEG_WATERMARK_FILE)
    ]).catch(() => {})
  }
}
