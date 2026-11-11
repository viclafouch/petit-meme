import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { MEME_TRANSLATION_SELECT, MEME_VIDEO_INCLUDE } from '~/constants/meme'
import { prismaClient } from '~/db/client.server'
import type { Meme } from '~/db/generated/prisma/client'
import { ActivityEventType, MemeStatus } from '~/db/generated/prisma/enums'
import { FREE_CAPS } from '~/helpers/cap'
import { localizeMemes } from '~/helpers/i18n-content'
import type { SessionUser } from '~/helpers/role'
import { authLogger } from '~/lib/logger'
import { getLocale } from '~/paraglide/runtime'
import { recordActivityEvent } from '~/server/activity/activity.server'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwCapReached } from '~/server/cap/cap.server'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

type ToggleUserBookmarkParams = {
  user: SessionUser
  memeId: Meme['id']
}

export const listBookmarkedMemes = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(async ({ context }) => {
    const isPremium = await matchIsUserPremium(context.user)

    const bookmarks = await prismaClient.bookmark.findMany({
      where: {
        userId: context.user.id,
        meme: { status: MemeStatus.PUBLISHED }
      },
      orderBy: { createdAt: 'desc' },
      take: isPremium ? undefined : FREE_CAPS.bookmark,
      select: {
        meme: {
          include: {
            ...MEME_VIDEO_INCLUDE,
            translations: { select: MEME_TRANSLATION_SELECT }
          }
        }
      }
    })

    const memes = bookmarks.map((bookmark) => {
      return bookmark.meme
    })

    return {
      bookmarks: localizeMemes(memes, getLocale()),
      count: bookmarks.length
    }
  })

const toggleUserBookmark = createServerOnlyFn(
  async ({ user, memeId }: ToggleUserBookmarkParams) => {
    const where = { userId_memeId: { userId: user.id, memeId } }

    return prismaClient.$transaction(async (transaction) => {
      const bookmark = await transaction.bookmark.findUnique({
        where,
        select: { id: true }
      })

      if (bookmark) {
        await transaction.bookmark.delete({ where })

        return { isBookmarked: false }
      }

      const bookmarkCount = await transaction.bookmark.count({
        where: { userId: user.id }
      })

      if (
        bookmarkCount >= FREE_CAPS.bookmark &&
        !(await matchIsUserPremium(user))
      ) {
        authLogger.warn({ userId: user.id }, 'Bookmark limit reached')

        return throwCapReached('bookmark')
      }

      await transaction.bookmark.create({
        data: { userId: user.id, memeId }
      })

      return { isBookmarked: true }
    })
  }
)

export const toggleBookmark = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: memeId, context }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      select: { id: true }
    })

    if (!meme) {
      throw notFound()
    }

    const { isBookmarked } = await toggleUserBookmark({
      user: context.user,
      memeId
    })

    authLogger.debug(
      { userId: context.user.id, memeId, isBookmarked },
      'Bookmark toggled'
    )

    if (isBookmarked) {
      recordActivityEvent({
        type: ActivityEventType.BOOKMARK_ADDED,
        actor: context.user,
        headers: getRequest().headers,
        memeId
      })
    }

    return { isBookmarked }
  })
