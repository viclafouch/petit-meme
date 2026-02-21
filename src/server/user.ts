import type { User } from 'better-auth'
import { z } from 'zod'
import { StudioError } from '@/constants/error'
import { FREE_PLAN } from '@/constants/plan'
import { prismaClient } from '@/db'
import type { Meme } from '@/db/generated/prisma/client'
import { authLogger } from '@/lib/logger'
import { matchIsUserAdmin } from '@/lib/role'
import { findActiveSubscription } from '@/server/customer'
import { authUserRequiredMiddleware } from '@/server/user-auth'
import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

export const getFavoritesMemes = createServerFn({ method: 'GET' })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ context }) => {
    const activeSubscription = await findActiveSubscription(context.user.id)

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
      take:
        // @ts-expect-error: better-auth user type lacks role field but it exists at runtime
        activeSubscription || matchIsUserAdmin(context.user)
          ? undefined
          : FREE_PLAN.maxFavoritesCount,
      include: {
        meme: {
          include: {
            video: true
          }
        }
      }
    })

    return {
      bookmarks: bookmarks.map((bookmark) => {
        return bookmark.meme
      }),
      count: bookmarks.length
    }
  })

export const checkGeneration = createServerFn({ method: 'POST' })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ context }) => {
    const [{ generationCount }, activeSubscription] = await Promise.all([
      prismaClient.user.findUniqueOrThrow({
        where: {
          id: context.user.id
        },
        select: {
          generationCount: true
        }
      }),
      findActiveSubscription(context.user.id)
    ])

    if (
      generationCount >= FREE_PLAN.maxGenerationsCount &&
      !activeSubscription &&
      // @ts-expect-error: better-auth user type lacks role field but it exists at runtime
      !matchIsUserAdmin(context.user)
    ) {
      authLogger.warn(
        { userId: context.user.id, generationCount },
        'Generation limit reached'
      )
      setResponseStatus(403)
      throw new StudioError('auth', { code: 'UNAUTHORIZED' })
    }

    return { result: 'ok' } as const
  })

const toggleBookmark = createServerOnlyFn(
  async (userId: User['id'], memeId: Meme['id']) => {
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

      const totalBookmarks = await tx.userBookmark.count({
        where: { userId }
      })

      if (totalBookmarks >= FREE_PLAN.maxFavoritesCount) {
        const activeSubscription = await findActiveSubscription(userId)

        if (!activeSubscription) {
          authLogger.warn({ userId }, 'Bookmark limit reached')
          setResponseStatus(403)
          throw new StudioError('premium required', {
            code: 'PREMIUM_REQUIRED'
          })
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

    const { bookmarked } = await toggleBookmark(context.user.id, memeId)

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
                title: true
              }
            }
          }
        }
      }
    })

    const subscriptions = await prismaClient.subscription.findMany({
      where: { referenceId: context.user.id },
      select: {
        plan: true,
        status: true,
        periodStart: true,
        periodEnd: true
      }
    })

    authLogger.info({ userId: context.user.id }, 'User data exported')

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
        generationCount: user.generationCount,
        stripeCustomerId: user.stripeCustomerId,
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
        return {
          memeTitle: bookmark.meme.title,
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
      })
    }
  })

export const incrementGenerationCount = createServerFn({ method: 'POST' })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ context }) => {
    await prismaClient.user.update({
      where: {
        id: context.user.id
      },
      data: {
        generationCount: {
          increment: 1
        }
      }
    })

    return { result: 'ok' } as const
  })
