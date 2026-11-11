import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { MEME_DERIVED_FORMATS } from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import type { Meme, Prisma } from '~/db/generated/prisma/client'
import { adminLogger } from '~/lib/logger'
import { logAuditAction } from '~/server/admin/audit/audit.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'
import {
  findMissingMemeFiles,
  moveMemeFileFromBlobToStorage,
  presignMemeFileUpload
} from '~/server/meme/meme-file.server'
import { fetchOriginalVideo } from '~/server/platforms/bunny.server'

const ORIGINAL_DOWNLOAD_TIMEOUT_MS = 15_000

const MEME_BUNNY_ID_SELECT = {
  video: { select: { bunnyId: true } }
} as const satisfies Prisma.MemeSelect

const findMemeBunnyId = async (memeId: Meme['id']) => {
  const meme = await prismaClient.meme.findUnique({
    where: { id: memeId },
    select: MEME_BUNNY_ID_SELECT
  })

  if (!meme) {
    return throwWithStatus(HTTP_STATUS.NOT_FOUND, new Error('Mème introuvable'))
  }

  return meme.video.bunnyId
}

export const getMissingMemeFiles = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)
    const missingFiles = await findMissingMemeFiles(bunnyId)

    return { missingFiles }
  })

export const createMemeFileUploads = createServerFn({ method: 'POST' })
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

export const getAdminMemeOriginal = createServerFn({ method: 'GET' })
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
