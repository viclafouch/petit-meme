/* oxlint-disable no-console */
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { prismaClient } from '~/db'
import { BUNNY_STORAGE_ENDPOINT } from '~/constants/bunny'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server'
import { checkMemeFileExists, uploadMemeFile } from '~/lib/meme-files'
import {
  FFMPEG_AUDIO_OUTPUT,
  FFMPEG_INPUT_FILE,
  FFMPEG_MP3_ENCODING_ARGS
} from '~/utils/ffmpeg'
import {
  buildMp3InputArgs,
  parseVideoProbe,
  VIDEO_PROBE_ARGS
} from '~/utils/mp3'
import { countResults, processWithConcurrency } from './lib/concurrency'
import { logEnvironmentInfo } from './lib/env-guard'
import { downloadOriginalVideo } from './lib/original-video'

// oxlint-disable-next-line typescript/strict-void-return -- util.promisify picks execFile's custom promisified form, not the callback overload the rule compares against
const execFileAsync = promisify(execFile)

const CONCURRENCY = 3
const BACKFILL_STATUSES = [MemeStatus.PUBLISHED, MemeStatus.ARCHIVED]
const FFMPEG_TIMEOUT_MS = 120_000

const MEME_VIDEO_SELECT = {
  id: true,
  video: { select: { bunnyId: true } }
} as const satisfies Prisma.MemeSelect

type MemeVideo = Prisma.MemeGetPayload<{ select: typeof MEME_VIDEO_SELECT }>

type BackfillResult = 'done' | 'skipped' | 'failed' | 'to-process'

const extractMp3 = async (bunnyId: string) => {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backfill-mp3-'))

  try {
    await downloadOriginalVideo(bunnyId, path.join(workDir, FFMPEG_INPUT_FILE))

    const { stdout } = await execFileAsync('ffprobe', VIDEO_PROBE_ARGS, {
      cwd: workDir,
      timeout: FFMPEG_TIMEOUT_MS
    })

    await execFileAsync(
      'ffmpeg',
      [
        '-v',
        'error',
        ...buildMp3InputArgs(parseVideoProbe(stdout)),
        ...FFMPEG_MP3_ENCODING_ARGS
      ],
      { cwd: workDir, timeout: FFMPEG_TIMEOUT_MS }
    )

    return await fs.readFile(path.join(workDir, FFMPEG_AUDIO_OUTPUT.fileName))
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}

const backfillMeme = async (
  { video: { bunnyId } }: MemeVideo,
  dryRun: boolean
): Promise<BackfillResult> => {
  if (await checkMemeFileExists(bunnyId, 'mp3')) {
    return 'skipped'
  }

  if (dryRun) {
    return 'to-process'
  }

  await uploadMemeFile(bunnyId, 'mp3', await extractMp3(bunnyId))

  return 'done'
}

const main = async () => {
  const { values } = parseArgs({
    options: { 'dry-run': { type: 'boolean', default: false } }
  })
  const dryRun = values['dry-run']

  logEnvironmentInfo()
  console.log(
    `Storage:         ${BUNNY_STORAGE_ENDPOINT}/${serverEnv.BUNNY_STORAGE_ZONE_NAME}`
  )
  console.log(`Mode:            ${dryRun ? 'DRY RUN' : 'WRITE'}\n`)

  const memes = await prismaClient.meme.findMany({
    where: { status: { in: BACKFILL_STATUSES } },
    select: MEME_VIDEO_SELECT,
    orderBy: { createdAt: 'asc' }
  })
  console.log(`Found ${memes.length} published or archived memes\n`)

  const results = await processWithConcurrency(
    memes,
    CONCURRENCY,
    async (meme, index) => {
      const prefix = `  [${index + 1}/${memes.length}] ${meme.id} ${meme.video.bunnyId}`

      try {
        const result = await backfillMeme(meme, dryRun)
        console.log(`${prefix} ${result}`)

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`${prefix} FAILED: ${message}`)

        return 'failed'
      }
    }
  )

  const counts = countResults(results)

  console.log('\n--- Summary ---')

  if (dryRun) {
    console.log(`To process: ${counts['to-process'] ?? 0}`)
  } else {
    console.log(`Done:       ${counts.done ?? 0}`)
  }

  console.log(`Skipped:    ${counts.skipped ?? 0}`)
  console.log(`Failed:     ${counts.failed ?? 0}`)

  process.exit((counts.failed ?? 0) > 0 ? 1 : 0)
}

void main()
