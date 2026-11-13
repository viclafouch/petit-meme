import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import {
  BUNNY_STORAGE_ENDPOINT,
  MEME_FIRST_FRAME_FILE_NAME
} from '~/constants/bunny'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server.server'
import { FFMPEG_INPUT_FILE } from '~/lib/ffmpeg'
import {
  encodeFirstFrameWithinBudget,
  fetchThumbnailBytes
} from '~/lib/first-frame'
import {
  checkMemeFileExists,
  uploadMemeFile
} from '~/server/meme/meme-file.server'
import { countResults, processWithConcurrency } from './lib/concurrency'
import { logEnvironmentInfo } from './lib/env-guard'
import { downloadOriginalVideo } from './lib/original-video'

// oxlint-disable-next-line typescript/strict-void-return -- util.promisify picks execFile's custom promisified form, not the callback overload the rule compares against
const execFileAsync = promisify(execFile)

const CONCURRENCY = 3
const TOOL_TIMEOUT_MS = 120_000
const FIRST_FRAME_PNG_FILE = 'first-frame.png'

const MEME_VIDEO_SELECT = {
  id: true,
  video: { select: { bunnyId: true } }
} as const satisfies Prisma.MemeSelect

type MemeVideo = Prisma.MemeGetPayload<{ select: typeof MEME_VIDEO_SELECT }>

type BackfillResult = 'done' | 'skipped' | 'failed' | 'to-process'

const assertCwebpIsInstalled = async () => {
  try {
    await execFileAsync('cwebp', ['-version'])
  } catch {
    throw new Error(
      'cwebp is missing, the local ffmpeg has no WebP encoder: brew install webp'
    )
  }
}

const extractFirstFrame = async (bunnyId: string) => {
  const workDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'backfill-first-frame-')
  )

  try {
    const [thumbnailBytes] = await Promise.all([
      fetchThumbnailBytes(bunnyId),
      downloadOriginalVideo(bunnyId, path.join(workDir, FFMPEG_INPUT_FILE))
    ])

    await execFileAsync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        FFMPEG_INPUT_FILE,
        '-frames:v',
        '1',
        '-y',
        FIRST_FRAME_PNG_FILE
      ],
      { cwd: workDir, timeout: TOOL_TIMEOUT_MS }
    )

    const image = await encodeFirstFrameWithinBudget({
      encode: async (quality) => {
        await execFileAsync(
          'cwebp',
          [
            '-quiet',
            '-q',
            String(quality),
            '-metadata',
            'none',
            FIRST_FRAME_PNG_FILE,
            '-o',
            MEME_FIRST_FRAME_FILE_NAME
          ],
          { cwd: workDir, timeout: TOOL_TIMEOUT_MS }
        )

        return fs.readFile(path.join(workDir, MEME_FIRST_FRAME_FILE_NAME))
      },
      maxBytes: thumbnailBytes
    })

    return Buffer.from(image)
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }
}

const backfillMeme = async (
  { video: { bunnyId } }: MemeVideo,
  dryRun: boolean
): Promise<BackfillResult> => {
  if (await checkMemeFileExists(bunnyId, 'first-frame')) {
    return 'skipped'
  }

  if (dryRun) {
    return 'to-process'
  }

  await uploadMemeFile(bunnyId, 'first-frame', await extractFirstFrame(bunnyId))

  return 'done'
}

const main = async () => {
  const { values } = parseArgs({
    options: { 'dry-run': { type: 'boolean', default: false } }
  })
  const dryRun = values['dry-run']

  logEnvironmentInfo()
  console.log(
    `Storage:         ${BUNNY_STORAGE_ENDPOINT}/${serverEnv.BUNNY_IMAGES_STORAGE_ZONE_NAME}`
  )
  console.log(`Mode:            ${dryRun ? 'DRY RUN' : 'WRITE'}\n`)

  if (!dryRun) {
    await assertCwebpIsInstalled()
  }

  const memes = await prismaClient.meme.findMany({
    where: { status: MemeStatus.PUBLISHED },
    select: MEME_VIDEO_SELECT,
    orderBy: { createdAt: 'asc' }
  })
  console.log(`Found ${memes.length} published memes\n`)

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
