import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { prismaClient } from '~/db'
import type { Meme, Prisma } from '~/db/generated/prisma/client'
import { serverEnv } from '~/env/server'
import {
  buildSignedOriginalUrl,
  buildStorageUrl,
  checkWatermarkExists,
  fetchWatermarkedVideo
} from '~/lib/bunny'
import { adminLogger } from '~/lib/logger'
import { logAuditAction } from '~/server/audit'
import { adminRequiredMiddleware } from '~/server/user-auth'

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

export const checkMemeWatermark = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)
    const exists = await checkWatermarkExists(bunnyId)

    return { exists }
  })

export const getWatermarkUploadConfig = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)

    return {
      bunnyId,
      url: buildStorageUrl(bunnyId),
      accessKey: serverEnv.BUNNY_STORAGE_API_KEY
    }
  })

export const logWatermarkUpload = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z
      .object({
        memeId: z.string(),
        bunnyId: z.string()
      })
      .parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data, context }) => {
    void logAuditAction({
      action: 'watermark_upload',
      actingAdminId: context.user.id,
      targetId: data.memeId,
      targetType: 'meme'
    })

    adminLogger.info(
      { memeId: data.memeId, bunnyId: data.bunnyId },
      'Watermark uploaded via admin'
    )

    return { success: true as const }
  })

export const fetchAdminVideoBlob = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)
    const originalUrl = await buildSignedOriginalUrl(bunnyId)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      return controller.abort()
    }, 15_000)

    try {
      const response = await fetch(originalUrl, {
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

export const previewMemeWatermark = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const bunnyId = await findMemeBunnyId(memeId)
    const upstream = await fetchWatermarkedVideo(bunnyId)

    const headers: HeadersInit = {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'video/mp4'
    }

    const contentLength = upstream.headers.get('Content-Length')

    if (contentLength) {
      headers['Content-Length'] = contentLength
    }

    return new Response(upstream.body, { headers })
  })
