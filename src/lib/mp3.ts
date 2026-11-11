import { z } from 'zod'
import type { FFmpeg, LogEvent } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import {
  FFMPEG_AUDIO_OUTPUT,
  FFMPEG_INPUT_FILE,
  FFMPEG_MP3_ENCODING_ARGS,
  readAndDeleteFFmpegOutput
} from '~/lib/ffmpeg'

type VideoProbe = {
  hasAudio: boolean
  duration: number
}

type ExtractMp3Params = {
  ffmpeg: FFmpeg
  videoBlob: Blob
}

const FFMPEG_PROBE_FILE = 'probe.json'
const FFMPEG_LOG_TAIL_LINES = 10
const SILENT_AUDIO_SOURCE = 'anullsrc=channel_layout=stereo:sample_rate=44100'

const PROBE_SCHEMA = z.object({
  streams: z.array(z.object({ codec_type: z.string() })).default([]),
  format: z.object({ duration: z.coerce.number().positive() })
})

export const VIDEO_PROBE_ARGS = [
  '-v',
  'error',
  '-select_streams',
  'a',
  '-show_entries',
  'stream=codec_type:format=duration',
  '-of',
  'json',
  FFMPEG_INPUT_FILE
] as const satisfies readonly string[]

export const parseVideoProbe = (probeOutput: string): VideoProbe => {
  const { streams, format } = PROBE_SCHEMA.parse(JSON.parse(probeOutput))

  return { hasAudio: streams.length > 0, duration: format.duration }
}

const probeVideo = async (ffmpeg: FFmpeg) => {
  await ffmpeg.ffprobe([...VIDEO_PROBE_ARGS, '-o', FFMPEG_PROBE_FILE])

  const probeOutput = await ffmpeg.readFile(FFMPEG_PROBE_FILE, 'utf8')

  if (typeof probeOutput !== 'string') {
    throw new TypeError('Unexpected FFprobe output format')
  }

  return parseVideoProbe(probeOutput)
}

export const buildMp3InputArgs = ({ hasAudio, duration }: VideoProbe) => {
  if (hasAudio) {
    return ['-i', FFMPEG_INPUT_FILE, '-map', '0:a:0']
  }

  return ['-f', 'lavfi', '-t', String(duration), '-i', SILENT_AUDIO_SOURCE]
}

export const extractMp3 = async ({ ffmpeg, videoBlob }: ExtractMp3Params) => {
  await ffmpeg.writeFile(FFMPEG_INPUT_FILE, await fetchFile(videoBlob))

  const logs: string[] = []

  const handleLog = ({ message }: LogEvent) => {
    logs.push(message)
  }

  ffmpeg.on('log', handleLog)

  try {
    const probe = await probeVideo(ffmpeg)
    const exitCode = await ffmpeg.exec([
      ...buildMp3InputArgs(probe),
      ...FFMPEG_MP3_ENCODING_ARGS
    ])

    if (exitCode !== 0) {
      const lastLogs = logs.slice(-FFMPEG_LOG_TAIL_LINES).join('\n')
      throw new Error(
        `FFmpeg MP3 extraction failed (exit ${exitCode}):\n${lastLogs}`
      )
    }

    return await readAndDeleteFFmpegOutput(ffmpeg, FFMPEG_AUDIO_OUTPUT)
  } finally {
    ffmpeg.off('log', handleLog)
    await Promise.all([
      ffmpeg.deleteFile(FFMPEG_INPUT_FILE),
      ffmpeg.deleteFile(FFMPEG_PROBE_FILE)
    ]).catch(() => {})
  }
}
