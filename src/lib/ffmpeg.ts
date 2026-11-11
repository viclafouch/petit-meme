import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { createClientOnlyFn } from '@tanstack/react-start'
import { FFMPEG_CORE_URL, FFMPEG_WASM_URL } from '~/constants/ffmpeg'
import { withTimeout } from '~/helpers/promise'

const FFMPEG_LOAD_TIMEOUT_MS = 30_000

export const loadFFmpeg = createClientOnlyFn(async (timeoutMessage: string) => {
  const ffmpeg = new FFmpeg()

  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL(FFMPEG_CORE_URL, 'text/javascript'),
    toBlobURL(FFMPEG_WASM_URL, 'application/wasm')
  ])

  try {
    await withTimeout(
      (abortController) => {
        return ffmpeg.load(
          { coreURL, wasmURL },
          { signal: abortController.signal }
        )
      },
      FFMPEG_LOAD_TIMEOUT_MS,
      timeoutMessage
    )
  } catch (error) {
    ffmpeg.terminate()
    throw error
  } finally {
    URL.revokeObjectURL(coreURL)
    URL.revokeObjectURL(wasmURL)
  }

  return ffmpeg
})

export const FFMPEG_INPUT_FILE = 'input.mp4'
export const FFMPEG_WATERMARK_FILE = 'watermark.png'
export const FFMPEG_TEXT_FILE = 'text.txt'

type FFmpegOutput = {
  fileName: string
  mimeType: string
}

const FFMPEG_VIDEO_OUTPUT = {
  fileName: 'output.mp4',
  mimeType: 'video/mp4'
} as const satisfies FFmpegOutput

export const FFMPEG_AUDIO_OUTPUT = {
  fileName: 'output.mp3',
  mimeType: 'audio/mpeg'
} as const satisfies FFmpegOutput

export const FFMPEG_VIDEO_ENCODING_ARGS = [
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
  FFMPEG_VIDEO_OUTPUT.fileName
] as const satisfies readonly string[]

export const FFMPEG_MP3_ENCODING_ARGS = [
  '-vn',
  '-c:a',
  'libmp3lame',
  '-q:a',
  '2',
  '-map_metadata',
  '-1',
  '-id3v2_version',
  '0',
  '-y',
  FFMPEG_AUDIO_OUTPUT.fileName
] as const satisfies readonly string[]

export const readAndDeleteFFmpegOutput = async (
  ffmpeg: FFmpeg,
  output: FFmpegOutput = FFMPEG_VIDEO_OUTPUT
) => {
  const outputData = await ffmpeg.readFile(output.fileName)
  await ffmpeg.deleteFile(output.fileName).catch(() => {})

  if (!(outputData instanceof globalThis.Uint8Array)) {
    throw new TypeError('Unexpected FFmpeg output format')
  }

  return new Blob([new Uint8Array(outputData)], { type: output.mimeType })
}
