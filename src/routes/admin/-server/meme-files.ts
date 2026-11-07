import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { MEME_DERIVED_FORMATS } from '~/constants/bunny'
import { prismaClient } from '~/db/client.server'
import type { Meme, Prisma } from '~/db/generated/prisma/client'
import { fetchOriginalVideo } from '~/lib/bunny.server'
import { adminLogger } from '~/lib/logger'
import {
  findMissingMemeFiles,
  moveMemeFileFromBlobToStorage,
  presignMemeFileUpload
} from '~/lib/meme-files.server'
import { logAuditAction } from '~/server/audit.server'
import { adminRequiredMiddleware } from '~/server/user-auth'

const ORIGINAL_DOWNLOAD_TIMEOUT_MS = 15_000

const MEME_BUNNY_ID_SELECT = {
  video: { select: { bunnyId: true } }
} as const satisfies Prisma.MemeSelect

async function findMemeBunnyId(memeId: Meme['id']) {
  const meme = await prismaClient.meme.findUnique({
    where: { id: memeId },
    select: MEME_BUNNY_ID_SELECT
  })

  if (!meme) {
    throw new Error('Meme not found')
  }

  return meme.video.bunnyId
}

export const checkMemeFiles = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)
    const missingFiles = await findMissingMemeFiles(bunnyId)

    return { missingFiles }
  })

export const getMemeFilesUploadConfig = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)
    const uploads = await Promise.all(
      MEME_DERIVED_FORMATS.map(async (format) => {
        return { format, url: await presignMemeFileUpload(bunnyId, format) }
      })
    )

    return { uploads }
  })

export const storeMemeFiles = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId, context }) => {
    const bunnyId = await findMemeBunnyId(memeId)

    await Promise.all(
      MEME_DERIVED_FORMATS.map((format) => {
        return moveMemeFileFromBlobToStorage(bunnyId, format)
      })
    )

    void logAuditAction({
      action: 'watermark_upload',
      actingAdminId: context.user.id,
      targetId: memeId,
      targetType: 'meme'
    })

    adminLogger.info({ memeId, bunnyId }, 'Meme files stored via admin')

    return { success: true as const }
  })

export const fetchAdminVideoBlob = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, ORIGINAL_DOWNLOAD_TIMEOUT_MS)

    try {
      const response = await fetchOriginalVideo(bunnyId, {
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`Bunny CDN responded with status ${response.status}`)
      }

      const headers: HeadersInit = {
        'Content-Type': response.headers.get('Content-Type') ?? 'video/mp4'
      }

      const contentLength = response.headers.get('Content-Length')

      if (contentLength) {
        headers['Content-Length'] = contentLength
      }

      return new Response(response.body, { headers })
    } finally {
      clearTimeout(timeoutId)
    }
  })
