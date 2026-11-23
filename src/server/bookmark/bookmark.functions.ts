import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import {
  MEME_TRANSLATION_SELECT,
  MEME_VIDEO_INCLUDE,
  MEMES_PER_PAGE
} from '~/constants/meme'
import { prismaClient } from '~/db/client.server'
import type { Meme } from '~/db/generated/prisma/client'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { FREE_CAPS } from '~/helpers/cap'
import { localizeMemes } from '~/helpers/i18n-content'
import type { SessionUser } from '~/helpers/role'
import { authLogger } from '~/lib/logger'
import { getLocale } from '~/paraglide/runtime'
import { recordActivityEvent } from '~/server/activity/activity.server'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { buildVisibleBookmarksWhere } from '~/server/bookmark/bookmark.server'
import { throwCapReached } from '~/server/cap/cap.server'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

type ToggleUserBookmarkParams = {
  user: SessionUser
  memeId: Meme['id']
}

const BOOKMARKS_PAGE_SCHEMA = z.number().int().min(1)

export const listBookmarkIds = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(async ({ context }) => {
    const bookmarks = await prismaClient.bookmark.findMany({
      where: buildVisibleBookmarksWhere(context.user.id),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { memeId: true }
    })

    return bookmarks.map((bookmark) => {
      return bookmark.memeId
    })
  })

export const listBookmarks = createServerFn({ method: 'GET' })
  .validator((data) => {
    return BOOKMARKS_PAGE_SCHEMA.parse(data)
  })
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: page, context }) => {
    const where = buildVisibleBookmarksWhere(context.user.id)
    const [total, bookmarks] = await Promise.all([
      prismaClient.bookmark.count({ where }),
      prismaClient.bookmark.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * MEMES_PER_PAGE,
        take: MEMES_PER_PAGE,
        select: {
          meme: {
            include: {
              ...MEME_VIDEO_INCLUDE,
              translations: { select: MEME_TRANSLATION_SELECT }
            }
          }
        }
      })
    ])
    const memes = bookmarks.map((bookmark) => {
      return bookmark.meme
    })

    return {
      memes: localizeMemes(memes, getLocale()),
      page,
      total,
      hasNextPage: page * MEMES_PER_PAGE < total
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
        where: buildVisibleBookmarksWhere(user.id)
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
