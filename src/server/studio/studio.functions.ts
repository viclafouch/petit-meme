import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { prismaClient } from '~/db/client.server'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { FREE_CAPS } from '~/helpers/cap'
import { matchCanViewMeme } from '~/helpers/role'
import { authLogger } from '~/lib/logger'
import { recordActivityEvent } from '~/server/activity/activity.server'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { findCapState, throwCapReached } from '~/server/cap/cap.server'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

export const getGenerationQuota = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(({ context }) => {
    return findCapState({ user: context.user, kind: 'generation' })
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
          generationCount: isPremium ? undefined : { lt: FREE_CAPS.generation }
        },
        data: { generationCount: { increment: 1 } }
      })

      if (count === 0) {
        authLogger.warn({ userId }, 'Generation limit reached')

        return throwCapReached('generation')
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
