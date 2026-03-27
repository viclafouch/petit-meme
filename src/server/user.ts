import type { User } from 'better-auth'
import { z } from 'zod'
import { StudioError } from '~/constants/error'
import { MEME_TRANSLATION_SELECT } from '~/constants/meme'
import {
  FREE_PLAN_MAX_FAVORITES,
  FREE_PLAN_MAX_GENERATIONS
} from '~/constants/plan'
import { prismaClient } from '~/db'
import type { Meme } from '~/db/generated/prisma/client'
import { resolveMemeTranslation } from '~/helpers/i18n-content'
import { authLogger } from '~/lib/logger'
import { matchIsUserAdmin } from '~/lib/role'
import { getLocale } from '~/paraglide/runtime'
import { findActiveSubscription, matchIsUserPremium } from '~/server/customer'
import { authUserRequiredMiddleware } from '~/server/user-auth'
import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

export const getFavoritesMemes = createServerFn({ method: 'GET' })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ context }) => {
    const isPremium = await matchIsUserPremium(context.user)

    const bookmarks = await prismaClient.userBookmark.findMany({
      where: {
        userId: context.user.id,
        meme: {
          status: 'PUBLISHED'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: isPremium ? undefined : FREE_PLAN_MAX_FAVORITES,
      include: {
        meme: {
          include: {
            video: true,
            translations: {
              select: MEME_TRANSLATION_SELECT
            }
          }
        }
      }
    })

    const locale = getLocale()

    return {
      bookmarks: bookmarks.map((bookmark) => {
        const { translations, ...meme } = bookmark.meme
        const resolved = resolveMemeTranslation({
          translations,
          contentLocale: meme.contentLocale,
          requestedLocale: locale,
          fallback: meme
        })

        return {
          ...meme,
          title: resolved.title,
          description: resolved.description
        }
      }),
      count: bookmarks.length
    }
  })

export const checkGeneration = createServerFn({ method: 'POST' })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ context }) => {
    const [{ generationCount }, isPremium] = await Promise.all([
      prismaClient.user.findUniqueOrThrow({
        where: {
          id: context.user.id
        },
        select: {
          generationCount: true
        }
      }),
      matchIsUserPremium(context.user)
    ])

    if (generationCount >= FREE_PLAN_MAX_GENERATIONS && !isPremium) {
      authLogger.warn(
        { userId: context.user.id, generationCount },
        'Generation limit reached'
      )
      setResponseStatus(403)
      throw new StudioError('unauthorized', { code: 'UNAUTHORIZED' })
    }

    return { result: 'ok' } as const
  })

type ToggleBookmarkParams = {
  userId: User['id']
  memeId: Meme['id']
  isAdmin: boolean
}

const toggleBookmark = createServerOnlyFn(
  async ({ userId, memeId, isAdmin }: ToggleBookmarkParams) => {
    return prismaClient.$transaction(async (tx) => {
      const bookmark = await tx.userBookmark.findUnique({
        // eslint-disable-next-line camelcase
        where: { userId_memeId: { userId, memeId } },
        select: { id: true }
      })

      if (bookmark) {
        await tx.userBookmark.delete({
          // eslint-disable-next-line camelcase
          where: { userId_memeId: { userId, memeId } }
        })

        return { bookmarked: false }
      }

      if (!isAdmin) {
        const totalBookmarks = await tx.userBookmark.count({
          where: { userId }
        })

        if (totalBookmarks >= FREE_PLAN_MAX_FAVORITES) {
          const activeSubscription = await findActiveSubscription(userId)

          if (!activeSubscription) {
            authLogger.warn({ userId }, 'Bookmark limit reached')
            setResponseStatus(403)
            throw new StudioError('premium_required', {
              code: 'PREMIUM_REQUIRED'
            })
          }
        }
      }

      await tx.userBookmark.create({
        data: { userId, memeId }
      })

      return { bookmarked: true }
    })
  }
)

export const toggleBookmarkByMemeId = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ data: memeId, context }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: memeId
      },
      select: {
        id: true
      }
    })

    if (!meme) {
      throw notFound()
    }

    const { bookmarked } = await toggleBookmark({
      userId: context.user.id,
      memeId,
      isAdmin: matchIsUserAdmin(context.user)
    })

    authLogger.debug(
      { userId: context.user.id, memeId, bookmarked },
      'Bookmark toggled'
    )

    return { bookmarked }
  })

export const exportUserData = createServerFn({ method: 'GET' })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ context }) => {
    const user = await prismaClient.user.findUniqueOrThrow({
      where: { id: context.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        locale: true,
        generationCount: true,
        stripeCustomerId: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        banned: true,
        banReason: true,
        banExpires: true,
        accounts: {
          select: {
            providerId: true,
            accountId: true,
            createdAt: true
          }
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
                  select: {
                    locale: true,
                    title: true,
                    description: true
                  }
                }
              }
            }
          }
        }
      }
    })

    const [subscriptions, studioGenerations] = await Promise.all([
      prismaClient.subscription.findMany({
        where: { referenceId: context.user.id },
        select: {
          plan: true,
          status: true,
          periodStart: true,
          periodEnd: true
        }
      }),
      prismaClient.studioGeneration.findMany({
        where: { userId: context.user.id },
        select: {
          createdAt: true,
          memeId: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    authLogger.info({ userId: context.user.id }, 'User data exported')

    const locale = getLocale()

    return {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role,
        locale: user.locale,
        generationCount: user.generationCount,
        hasStripeAccount: user.stripeCustomerId !== null,
        termsAcceptedAt: user.termsAcceptedAt,
        privacyAcceptedAt: user.privacyAcceptedAt,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires
      },
      accounts: user.accounts.map((account) => {
        return {
          providerId: account.providerId,
          accountId: account.accountId,
          createdAt: account.createdAt
        }
      }),
      sessions: user.sessions.map((session) => {
        return {
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent
        }
      }),
      bookmarks: user.bookmarks.map((bookmark) => {
        const resolved = resolveMemeTranslation({
          translations: bookmark.meme.translations,
          contentLocale: bookmark.meme.contentLocale,
          requestedLocale: locale,
          fallback: bookmark.meme
        })

        return {
          memeTitle: resolved.title,
          createdAt: bookmark.createdAt
        }
      }),
      subscriptions: subscriptions.map((subscription) => {
        return {
          plan: subscription.plan,
          status: subscription.status,
          periodStart: subscription.periodStart,
          periodEnd: subscription.periodEnd
        }
      }),
      studioGenerations: studioGenerations.map((generation) => {
        return {
          createdAt: generation.createdAt,
          memeId: generation.memeId
        }
      })
    }
  })

export const incrementGenerationCount = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z.object({ memeId: z.string() }).parse(data)
  })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ data, context }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: data.memeId, status: 'PUBLISHED' },
      select: { id: true }
    })

    if (!meme) {
      throw notFound()
    }

    await prismaClient.$transaction([
      prismaClient.user.update({
        where: { id: context.user.id },
        data: { generationCount: { increment: 1 } }
      }),
      prismaClient.studioGeneration.create({
        data: { userId: context.user.id, memeId: data.memeId }
      })
    ])

    return { result: 'ok' } as const
  })
