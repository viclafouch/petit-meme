import { FFMPEG_CORE_URL, FFMPEG_WASM_URL } from '@/constants/ffmpeg'
import { withTimeout } from '@/helpers/promise'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { createClientOnlyFn } from '@tanstack/react-start'

const FFMPEG_LOAD_TIMEOUT_MS = 30_000

export const loadFFmpeg = createClientOnlyFn(async (timeoutMessage: string) => {
  const ffmpeg = new FFmpeg()

  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL(FFMPEG_CORE_URL, 'text/javascript'),
    toBlobURL(FFMPEG_WASM_URL, 'application/wasm')
  ])

  await withTimeout(
    ffmpeg.load({ coreURL, wasmURL }),
    FFMPEG_LOAD_TIMEOUT_MS,
    timeoutMessage
  )

  return ffmpeg
})

// Virtual filesystem filenames used by ffmpeg WASM pipelines
export const FFMPEG_INPUT_FILE = 'input.mp4'
export const FFMPEG_OUTPUT_FILE = 'output.mp4'
export const FFMPEG_WATERMARK_FILE = 'watermark.png'
export const FFMPEG_TEXT_FILE = 'text.txt'

/**
 * Shared encoding args for ffmpeg WASM (H.264, single-threaded).
 * Appended after input/filter args by both studio and watermark pipelines.
 *
 * Codec: libx264, audio copied, ultrafast preset, CRF 20, yuv420p.
 * Output always written to FFMPEG_OUTPUT_FILE in the ffmpeg virtual filesystem.
 */
export const FFMPEG_ENCODING_ARGS = [
  '-c:v',
  'libx264',
  '-c:a',
  'copy',
  '-preset',
  'ultrafast',
  '-crf',
  '20',
  '-pix_fmt',
  'yuv420p',
  '-threads',
  '1',
  '-map_metadata',
  '-1',
  '-y',
  FFMPEG_OUTPUT_FILE
] as const satisfies readonly string[]

/**
 * Read FFMPEG_OUTPUT_FILE from the ffmpeg virtual filesystem and return it as a Blob.
 * Cleans up the output file after reading. Caller is responsible for cleaning
 * up their own input/temp files (e.g. FFMPEG_TEXT_FILE, FFMPEG_WATERMARK_FILE).
 */
export const readFFmpegOutput = async (ffmpeg: FFmpeg) => {
  const outputData = await ffmpeg.readFile(FFMPEG_OUTPUT_FILE)
  await ffmpeg.deleteFile(FFMPEG_OUTPUT_FILE).catch(() => {})

  if (!(outputData instanceof Uint8Array)) {
    throw new Error('Unexpected FFmpeg output format')
  }

  return new Blob([outputData.buffer as ArrayBuffer], { type: 'video/mp4' })
}
