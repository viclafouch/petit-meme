import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { FREE_PLAN_MAX_GENERATIONS } from '~/constants/plan'
import { prismaClient } from '~/db/client.server'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { authLogger } from '~/lib/logger'
import { matchCanViewMeme } from '~/lib/role'
import { recordActivityEvent } from '~/server/activity/activity.server'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

export const getGenerationQuota = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(async ({ context }) => {
    const [{ generationCount }, isPremium] = await Promise.all([
      prismaClient.user.findUniqueOrThrow({
        where: { id: context.user.id },
        select: { generationCount: true }
      }),
      matchIsUserPremium(context.user)
    ])

    return {
      canGenerate: isPremium || generationCount < FREE_PLAN_MAX_GENERATIONS
    }
  })

export const createGeneration = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.object({ memeId: z.string() }).parse(data)
  })
  .middleware([userRequiredMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id
    const [meme, isPremium] = await Promise.all([
      prismaClient.meme.findUnique({
        where: { id: data.memeId },
        select: { id: true, status: true }
      }),
      matchIsUserPremium(context.user)
    ])

    if (
      !meme ||
      !matchCanViewMeme({ user: context.user, status: meme.status })
    ) {
      throw notFound()
    }

    await prismaClient.$transaction(async (transaction) => {
      const { count } = await transaction.user.updateMany({
        where: {
          id: userId,
          generationCount: isPremium
            ? undefined
            : { lt: FREE_PLAN_MAX_GENERATIONS }
        },
        data: { generationCount: { increment: 1 } }
      })

      if (count === 0) {
        authLogger.warn({ userId }, 'Generation limit reached')

        return throwWithStatus(
          HTTP_STATUS.FORBIDDEN,
          new AppError('premium_required', { code: 'PREMIUM_REQUIRED' })
        )
      }

      await transaction.studioGeneration.create({
        data: { userId, memeId: meme.id }
      })
    })

    recordActivityEvent({
      type: ActivityEventType.GENERATION,
      actor: context.user,
      headers: getRequest().headers,
      memeId: meme.id
    })
  })
