import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { HTTP_STATUS } from '~/constants/http'
import { MEME_FILL_SUGGESTION_SCHEMA } from '~/constants/meme-fill-suggestion'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import { getErrorMessage } from '~/helpers/error'
import { adminLogger } from '~/lib/logger'
import { locales } from '~/paraglide/runtime'
import { translateMemeDraft } from '~/server/admin/ai-assist/meme-draft.server'
import {
  buildNightQueueWhere,
  matchIsFillStalled
} from '~/server/admin/ai-assist/meme-fill.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'

const GEMINI_TRANSLATION_TIMEOUT_MS = 60_000

const MEME_RECORD_TRANSLATION_SCHEMA = z.object({
  sourceLocale: z.enum(locales),
  targetLocales: z.array(z.enum(locales)).min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).min(1)
})

export const translateMemeRecord = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator((data) => {
    return MEME_RECORD_TRANSLATION_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    try {
      const translated = await translateMemeDraft({
        ...data,
        timeoutMs: GEMINI_TRANSLATION_TIMEOUT_MS
      })

      adminLogger.info(
        { sourceLocale: data.sourceLocale, targetLocales: data.targetLocales },
        'AI translation completed'
      )

      return translated
    } catch (error) {
      adminLogger.error(
        { error, sourceLocale: data.sourceLocale },
        'AI translation failed'
      )

      return throwWithStatus(
        HTTP_STATUS.BAD_GATEWAY,
        new Error(`La traduction AI a échoué : ${getErrorMessage(error)}`, {
          cause: error
        })
      )
    }
  })

export const getAdminMemeFill = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const checkedAt = new Date()
    const [meme, queuedTonightCount] = await Promise.all([
      prismaClient.meme.findUnique({
        where: { id: memeId },
        select: {
          fillStatus: true,
          fillDoubt: true,
          fillSuggestion: true,
          updatedAt: true
        }
      }),
      prismaClient.meme.count({
        where: { id: memeId, ...buildNightQueueWhere(checkedAt) }
      })
    ])

    if (!meme) {
      throw notFound()
    }

    const suggestion = MEME_FILL_SUGGESTION_SCHEMA.safeParse(
      meme.fillSuggestion
    )

    return {
      status: meme.fillStatus,
      doubt: meme.fillDoubt,
      suggestion: suggestion.success ? suggestion.data : null,
      isStalled: matchIsFillStalled({
        status: meme.fillStatus,
        updatedAt: meme.updatedAt,
        checkedAt
      }),
      isQueuedTonight: queuedTonightCount > 0
    }
  })

export const keepMemeFillSuggestion = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z
      .object({ memeId: z.string(), suggestion: MEME_FILL_SUGGESTION_SCHEMA })
      .parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data }) => {
    await prismaClient.meme.updateMany({
      where: { id: data.memeId, fillStatus: MemeFillStatus.FILLED },
      data: { fillSuggestion: data.suggestion }
    })
  })

export const settleMemeFillSuggestion = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.object({ memeId: z.string(), isApplied: z.boolean() }).parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data }) => {
    await prismaClient.meme.updateMany({
      where: { id: data.memeId, fillStatus: MemeFillStatus.FILLED },
      data: data.isApplied
        ? { fillSuggestion: Prisma.DbNull }
        : {
            fillSuggestion: Prisma.DbNull,
            fillStatus: MemeFillStatus.NONE,
            fillDoubt: ''
          }
    })
  })
