import { z } from 'zod'
import { prismaClient } from '@/db'
import type { Meme, Prisma } from '@/db/generated/prisma/client'
import {
  checkWatermarkExists,
  fetchWatermarkedVideo,
  uploadWatermarkedVideo
} from '@/lib/bunny'
import { adminLogger } from '@/lib/logger'
import { logAuditAction } from '@/server/audit'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { createServerFn } from '@tanstack/react-start'

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

export const uploadMemeWatermark = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    const formData = z.instanceof(FormData).parse(data)

    return z
      .object({
        memeId: z.string(),
        video: z.file().min(1).mime('video/mp4')
      })
      .parse({
        memeId: formData.get('memeId'),
        video: formData.get('video')
      })
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data, context }) => {
    const bunnyId = await findMemeBunnyId(data.memeId)

    const buffer = Buffer.from(await data.video.arrayBuffer())
    await uploadWatermarkedVideo(bunnyId, buffer)

    void logAuditAction({
      action: 'watermark_upload',
      actingAdminId: context.user.id,
      targetId: data.memeId,
      targetType: 'meme'
    })

    adminLogger.info(
      { memeId: data.memeId, bunnyId },
      'Watermark uploaded via admin'
    )

    return { success: true as const }
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
