import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import {
  AVATAR_CATALOG,
  AVATAR_PROVIDER_SELECTION,
  type AvatarSelection
} from '~/constants/avatar'
import { HTTP_STATUS } from '~/constants/http'
import { LOCALE_SCHEMA } from '~/constants/locale'
import { RATE_LIMIT_UPDATE_AVATAR } from '~/constants/rate-limit'
import { prismaClient } from '~/db/client.server'
import { matchIsAvatarPath, resolveAvatar } from '~/helpers/avatar'
import { resolveMemeTranslation } from '~/helpers/i18n-content'
import { authLogger } from '~/lib/logger'
import { getLocale } from '~/paraglide/runtime'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { findCachedSession } from '~/server/auth/auth.server'
import { throwWithStatus } from '~/server/http/http.server'
import { createRateLimitMiddleware } from '~/server/rate-limit/rate-limit.middleware'
import { syncUserLocale } from '~/server/user/user.server'

export const updateUserLocale = createServerFn({ method: 'POST' })
  .validator((data) => {
    return LOCALE_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const session = await findCachedSession(getRequest().headers)

    if (!session) {
      return
    }

    await syncUserLocale({ userId: session.user.id, locale: data.locale })
  })

const AVATAR_SELECTION_SCHEMA = z.enum([
  ...AVATAR_CATALOG.map((slot) => {
    return slot.id
  }),
  AVATAR_PROVIDER_SELECTION
])

const PROVIDER_AVATAR_UNAVAILABLE_MESSAGE = 'Provider avatar unavailable'

type ResolveNextAvatarParams = {
  selection: AvatarSelection
  providerAvatar: string | null
}

const resolveNextAvatar = ({
  selection,
  providerAvatar
}: ResolveNextAvatarParams) => {
  const nextImage = resolveAvatar({ selection, providerAvatar })

  if (nextImage === null) {
    return throwWithStatus(
      HTTP_STATUS.BAD_REQUEST,
      new Error(PROVIDER_AVATAR_UNAVAILABLE_MESSAGE)
    )
  }

  return nextImage
}

export const updateUserAvatar = createServerFn({ method: 'POST' })
  .validator((data) => {
    return AVATAR_SELECTION_SCHEMA.parse(data)
  })
  .middleware([
    userRequiredMiddleware,
    createRateLimitMiddleware(RATE_LIMIT_UPDATE_AVATAR)
  ])
  .handler(async ({ data: selection, context }) => {
    const { image, providerAvatar } = await prismaClient.user.findUniqueOrThrow(
      {
        where: { id: context.user.id },
        select: { image: true, providerAvatar: true }
      }
    )

    const recoveredProviderAvatar =
      providerAvatar === null && image !== null && !matchIsAvatarPath(image)
        ? image
        : null

    const nextImage = resolveNextAvatar({
      selection,
      providerAvatar: providerAvatar ?? recoveredProviderAvatar
    })

    await prismaClient.user.update({
      where: { id: context.user.id },
      data: {
        image: nextImage,
        ...(!recoveredProviderAvatar
          ? {}
          : { providerAvatar: recoveredProviderAvatar })
      }
    })

    authLogger.debug(
      { userId: context.user.id, selection },
      'User avatar updated'
    )

    return { image: nextImage }
  })

export const exportUserData = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id
    const { stripeCustomerId, accounts, sessions, bookmarks, ...profile } =
      await prismaClient.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          providerAvatar: true,
          createdAt: true,
          updatedAt: true,
          role: true,
          locale: true,
          lastActiveAt: true,
          generationCount: true,
          stripeCustomerId: true,
          premiumGrantedAt: true,
          termsAcceptedAt: true,
          privacyAcceptedAt: true,
          banned: true,
          banReason: true,
          banExpires: true,
          accounts: {
            select: { providerId: true, accountId: true, createdAt: true }
          },
          sessions: {
            select: {
              createdAt: true,
              expiresAt: true,
              ipAddress: true,
              userAgent: true
            }
          },
          bookmarks: {
            select: {
              createdAt: true,
              meme: {
                select: {
                  title: true,
                  description: true,
                  contentLocale: true,
                  translations: {
                    select: { locale: true, title: true, description: true }
                  }
                }
              }
            }
          }
        }
      })

    const [subscriptions, studioGenerations, aiSearchLogs, activityEvents] =
      await Promise.all([
        prismaClient.subscription.findMany({
          where: { referenceId: userId },
          select: {
            plan: true,
            billingInterval: true,
            status: true,
            periodStart: true,
            periodEnd: true
          }
        }),
        prismaClient.studioGeneration.findMany({
          where: { userId },
          select: { createdAt: true, memeId: true },
          orderBy: { createdAt: 'desc' }
        }),
        prismaClient.aiSearchLog.findMany({
          where: { userId },
          select: {
            prompt: true,
            keywords: true,
            locale: true,
            resultCount: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prismaClient.activityEvent.findMany({
          where: { userId },
          select: {
            type: true,
            createdAt: true,
            memeId: true,
            ipAddress: true,
            country: true,
            userAgent: true,
            metadata: true,
            format: true
          },
          orderBy: { createdAt: 'desc' }
        })
      ])

    authLogger.info({ userId }, 'User data exported')

    const locale = getLocale()

    return {
      profile: { ...profile, hasStripeAccount: stripeCustomerId !== null },
      accounts,
      sessions,
      bookmarks: bookmarks.map(({ meme, createdAt }) => {
        const { title } = resolveMemeTranslation({
          translations: meme.translations,
          contentLocale: meme.contentLocale,
          requestedLocale: locale,
          fallback: meme
        })

        return { memeTitle: title, createdAt }
      }),
      subscriptions,
      studioGenerations,
      aiSearchLogs,
      activityEvents
    }
  })
