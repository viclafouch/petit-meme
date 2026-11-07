import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { FREE_PLAN_MAX_GENERATIONS } from '~/constants/plan'
import { prismaClient } from '~/db/client.server'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { authLogger } from '~/lib/logger'
import { matchCanViewMeme } from '~/lib/role'
import { matchIsUserPremium } from '~/server/customer'
import { authUserRequiredMiddleware } from '~/server/user-auth'
import { recordActivityEvent } from '~/utils/activity-event.server'

export const checkGenerationQuota = createServerFn({ method: 'GET' })
  .middleware([authUserRequiredMiddleware])
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

export const recordGeneration = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.object({ memeId: z.string() }).parse(data)
  })
  .middleware([authUserRequiredMiddleware])
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
        setResponseStatus(HTTP_STATUS.FORBIDDEN)
        throw new AppError('premium_required', { code: 'PREMIUM_REQUIRED' })
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
