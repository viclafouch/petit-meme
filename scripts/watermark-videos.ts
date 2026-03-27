/* eslint-disable no-console */
import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import {
  WATERMARK_ASSET_PATH,
  WATERMARK_FFMPEG_FILTER
} from '~/constants/watermark'
import { prismaClient } from '~/db'
import type { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server'
import {
  checkWatermarkExists,
  signOriginalUrl,
  uploadWatermarkedVideo
} from '~/lib/bunny'
import { logEnvironmentInfo } from './lib/env-guard'

const execFileAsync = promisify(execFile)

const OUTPUT_DIR = path.resolve('watermarked')
const WATERMARK_PATH = path.resolve(`public${WATERMARK_ASSET_PATH}`)
const CONCURRENCY = 3
const FETCH_TIMEOUT_MS = 30_000
const FFMPEG_TIMEOUT_MS = 120_000
const FFMPEG_MAX_BUFFER = 10 * 1024 * 1024

const MEME_VIDEO_SELECT = {
  id: true,
  video: { select: { bunnyId: true } }
} as const satisfies Prisma.MemeSelect

type MemeVideo = Prisma.MemeGetPayload<{ select: typeof MEME_VIDEO_SELECT }>

const UPLOAD_CONCURRENCY = 2

type ParsedOptions = {
  limit: number | undefined
  memeId: string | undefined
  dryRun: boolean
  upload: boolean
}

const fetchMemes = async ({
  limit,
  memeId
}: ParsedOptions): Promise<MemeVideo[]> => {
  if (memeId) {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId, status: MemeStatus.PUBLISHED },
      select: MEME_VIDEO_SELECT
    })

    if (!meme) {
      throw new Error(`Meme ${memeId} not found or not published`)
    }

    return [meme]
  }

  return prismaClient.meme.findMany({
    where: { status: MemeStatus.PUBLISHED },
    select: MEME_VIDEO_SELECT,
    orderBy: { createdAt: 'asc' },
    ...(limit ? { take: limit } : {})
  })
}

const downloadVideo = async (bunnyId: string, destPath: string) => {
  const url = await signOriginalUrl(bunnyId)
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    return controller.abort()
  }, FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Empty response body')
    }

    await pipeline(
      Readable.fromWeb(response.body as never),
      createWriteStream(destPath)
    )
  } finally {
    clearTimeout(timeout)
  }
}

const runFFmpeg = async (inputPath: string, outputPath: string) => {
  await execFileAsync(
    'ffmpeg',
    [
      '-i',
      inputPath,
      '-i',
      WATERMARK_PATH,
      '-filter_complex',
      WATERMARK_FFMPEG_FILTER,
      '-map',
      '0:a:0?',
      '-c:v',
      'libx264',
      '-c:a',
      'copy',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-map_metadata',
      '-1',
      '-y',
      outputPath
    ],
    { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: FFMPEG_MAX_BUFFER }
  )
}

type ProcessResult = 'processed' | 'skipped' | 'dry-run' | 'error'

const hasValidOutput = async (filePath: string) => {
  try {
    const stat = await fs.stat(filePath)

    return stat.size > 0
  } catch {
    return false
  }
}

const processMeme = async (
  meme: MemeVideo,
  dryRun: boolean
): Promise<ProcessResult> => {
  const { bunnyId } = meme.video
  const outputPath = path.join(OUTPUT_DIR, `${bunnyId}.mp4`)

  if (await hasValidOutput(outputPath)) {
    return 'skipped'
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would process ${bunnyId}`)

    return 'dry-run'
  }

  const tempInputPath = path.join(OUTPUT_DIR, `_input_${bunnyId}.mp4`)

  try {
    await downloadVideo(bunnyId, tempInputPath)
    await runFFmpeg(tempInputPath, outputPath)

    return 'processed'
  } catch (error) {
    await fs.unlink(outputPath).catch(() => {})
    throw error
  } finally {
    await fs.unlink(tempInputPath).catch(() => {})
  }
}

const processWithConcurrency = async <T, TResult extends string>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<TResult>
) => {
  const results: TResult[] = []
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      const item = items[index]

      if (item) {
        // eslint-disable-next-line no-await-in-loop -- intentional sequential processing within each concurrent worker
        results[index] = await fn(item, index)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => {
      return worker()
    })
  )

  return results
}

const parseArgs = (): ParsedOptions => {
  const args = process.argv.slice(2)
  const options: ParsedOptions = {
    limit: 50,
    memeId: undefined,
    dryRun: false,
    upload: false
  }

  let argIndex = 0

  while (argIndex < args.length) {
    const arg = args[argIndex]

    switch (arg) {
      case '--limit': {
        argIndex += 1
        options.limit = Number(args[argIndex])
        break
      }

      case '--meme-id': {
        argIndex += 1
        options.memeId = args[argIndex]
        break
      }

      case '--dry-run': {
        options.dryRun = true
        break
      }

      case '--all': {
        options.limit = undefined
        break
      }

      case '--upload': {
        options.upload = true
        break
      }

      default: {
        console.error(`Unknown argument: ${arg}`)
        process.exit(1)
      }
    }

    argIndex += 1
  }

  return options
}

const computeTotalSize = async () => {
  const files = await fs.readdir(OUTPUT_DIR)
  const mp4Files = files.filter((file) => {
    return file.endsWith('.mp4') && !file.startsWith('_input_')
  })

  const stats = await Promise.all(
    mp4Files.map((file) => {
      return fs.stat(path.join(OUTPUT_DIR, file))
    })
  )

  let totalBytes = 0

  for (const stat of stats) {
    totalBytes += stat.size
  }

  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)

  return { totalMB, fileCount: mp4Files.length }
}

const countResults = <T extends string>(results: T[]) => {
  const counts = {} as Record<T, number>

  for (const result of results) {
    counts[result] = (counts[result] ?? 0) + 1
  }

  return counts
}

type UploadResult = 'uploaded' | 'skipped' | 'error'

const processAndUploadMeme = async (meme: MemeVideo): Promise<UploadResult> => {
  const { bunnyId } = meme.video

  if (await checkWatermarkExists(bunnyId)) {
    return 'skipped'
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'watermark-'))
  const tempInputPath = path.join(tmpDir, `input_${bunnyId}.mp4`)
  const tempOutputPath = path.join(tmpDir, `output_${bunnyId}.mp4`)

  try {
    await downloadVideo(bunnyId, tempInputPath)
    await runFFmpeg(tempInputPath, tempOutputPath)

    const fileBuffer = await fs.readFile(tempOutputPath)
    await uploadWatermarkedVideo(bunnyId, fileBuffer)

    return 'uploaded'
  } finally {
    await fs.rm(tmpDir, { recursive: true }).catch(() => {})
  }
}

const formatProgress = (index: number, total: number, bunnyId: string) => {
  return `  [${index + 1}/${total}] ${bunnyId}`
}

const runUpload = async (options: ParsedOptions) => {
  await fs.access(WATERMARK_PATH)

  console.log(
    `Storage:   ${serverEnv.BUNNY_STORAGE_HOSTNAME}/${serverEnv.BUNNY_STORAGE_ZONE_NAME}`
  )
  console.log(`Watermark: ${WATERMARK_PATH}`)

  if (options.dryRun) {
    console.log('Mode:      DRY RUN')
  }

  console.log('')

  const memes = await fetchMemes(options)
  console.log(`Found ${memes.length} published memes to process\n`)

  if (memes.length === 0) {
    process.exit(0)
  }

  const results = await processWithConcurrency(
    memes,
    UPLOAD_CONCURRENCY,
    async (meme, index) => {
      const prefix = formatProgress(index, memes.length, meme.video.bunnyId)

      if (options.dryRun) {
        const exists = await checkWatermarkExists(meme.video.bunnyId)
        console.log(
          `${prefix} [DRY RUN] storage=${exists ? 'exists' : 'missing'}`
        )

        return 'skipped'
      }

      try {
        const result = await processAndUploadMeme(meme)

        if (result === 'uploaded') {
          console.log(`${prefix} uploaded`)
        } else if (result === 'skipped') {
          console.log(`${prefix} (already in Storage)`)
        }

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`${prefix} FAILED: ${message}`)

        return 'error'
      }
    }
  )

  const counts = countResults(results)

  console.log('\n--- Upload Summary ---')
  console.log(`Uploaded:  ${counts.uploaded ?? 0}`)
  console.log(`Skipped:   ${counts.skipped ?? 0}`)
  console.log(`Errors:    ${counts.error ?? 0}`)

  process.exit((counts.error ?? 0) > 0 ? 1 : 0)
}

const main = async () => {
  logEnvironmentInfo()

  const options = parseArgs()

  if (options.upload) {
    await runUpload(options)

    return
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.access(WATERMARK_PATH)

  console.log(`Watermark: ${WATERMARK_PATH}`)
  console.log(`Output:    ${OUTPUT_DIR}`)

  if (options.dryRun) {
    console.log('Mode:      DRY RUN')
  }

  console.log('')

  const memes = await fetchMemes(options)
  console.log(`Found ${memes.length} published memes to process\n`)

  if (memes.length === 0) {
    process.exit(0)
  }

  const results = await processWithConcurrency(
    memes,
    CONCURRENCY,
    async (meme, index) => {
      try {
        const result = await processMeme(meme, options.dryRun)
        const prefix = formatProgress(index, memes.length, meme.video.bunnyId)

        if (result === 'processed') {
          console.log(`${prefix} done`)
        } else if (result === 'skipped') {
          console.log(`${prefix} (skipped)`)
        }

        return result
      } catch (error) {
        const prefix = formatProgress(index, memes.length, meme.video.bunnyId)
        const message = error instanceof Error ? error.message : String(error)
        console.error(`${prefix} FAILED: ${message}`)

        return 'error'
      }
    }
  )

  const counts = countResults(results)

  console.log('\n--- Summary ---')
  console.log(`Processed: ${counts.processed ?? 0}`)
  console.log(`Skipped:   ${counts.skipped ?? 0}`)
  console.log(`Errors:    ${counts.error ?? 0}`)

  if ((counts.processed ?? 0) > 0 || (counts.skipped ?? 0) > 0) {
    const { totalMB, fileCount } = await computeTotalSize()
    console.log(`Total size: ${totalMB} MB (${fileCount} files)`)
  }

  process.exit((counts.error ?? 0) > 0 ? 1 : 0)
}

void main()
