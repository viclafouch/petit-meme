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
import {
  buildVisibleBookmarksWhere,
  VISIBLE_BOOKMARKS_ORDER_BY
} from '~/server/bookmark/bookmark.server'
import { throwCapReached } from '~/server/cap/cap.server'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

type CreateUserBookmarkParams = {
  user: SessionUser
  memeId: Meme['id']
}

const BOOKMARKS_PAGE_SCHEMA = z.object({
  page: z.number().int().min(1),
  after: z.object({ createdAt: z.iso.datetime(), id: z.string() }).nullable()
})

export type BookmarksPageParam = z.infer<typeof BOOKMARKS_PAGE_SCHEMA>

export const listBookmarkIds = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(async ({ context }) => {
    const bookmarks = await prismaClient.bookmark.findMany({
      where: buildVisibleBookmarksWhere(context.user.id),
      orderBy: VISIBLE_BOOKMARKS_ORDER_BY,
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
  .handler(async ({ data: { page, after }, context }) => {
    const where = buildVisibleBookmarksWhere(context.user.id)
    const [total, bookmarks] = await Promise.all([
      prismaClient.bookmark.count({ where }),
      prismaClient.bookmark.findMany({
        where: after
          ? {
              ...where,
              OR: [
                { createdAt: { lt: new Date(after.createdAt) } },
                { createdAt: new Date(after.createdAt), id: { lt: after.id } }
              ]
            }
          : where,
        orderBy: VISIBLE_BOOKMARKS_ORDER_BY,
        take: MEMES_PER_PAGE + 1,
        select: {
          id: true,
          createdAt: true,
          meme: {
            include: {
              ...MEME_VIDEO_INCLUDE,
              translations: { select: MEME_TRANSLATION_SELECT }
            }
          }
        }
      })
    ])
    const pageBookmarks = bookmarks.slice(0, MEMES_PER_PAGE)
    const lastBookmark = pageBookmarks.at(-1)
    const memes = pageBookmarks.map((bookmark) => {
      return bookmark.meme
    })

    return {
      memes: localizeMemes(memes, getLocale()),
      page,
      total,
      next:
        bookmarks.length > MEMES_PER_PAGE && lastBookmark
          ? {
              page: page + 1,
              after: {
                createdAt: lastBookmark.createdAt.toISOString(),
                id: lastBookmark.id
              }
            }
          : null
    }
  })

const BOOKMARK_UPDATE_SCHEMA = z.object({
  memeId: z.string(),
  isBookmarked: z.boolean()
})

const createUserBookmark = createServerOnlyFn(
  async ({ user, memeId }: CreateUserBookmarkParams) => {
    return prismaClient.$transaction(async (transaction) => {
      const bookmark = await transaction.bookmark.findUnique({
        where: { userId_memeId: { userId: user.id, memeId } },
        select: { id: true }
      })

      if (bookmark) {
        return { isCreated: false }
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

      return { isCreated: true }
    })
  }
)

export const updateBookmark = createServerFn({ method: 'POST' })
  .validator((data) => {
    return BOOKMARK_UPDATE_SCHEMA.parse(data)
  })
  .middleware([userRequiredMiddleware])
  .handler(async ({ data: { memeId, isBookmarked }, context }) => {
    if (!isBookmarked) {
      await prismaClient.bookmark.deleteMany({
        where: { userId: context.user.id, memeId }
      })

      return { isBookmarked }
    }

    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      select: { id: true }
    })

    if (!meme) {
      throw notFound()
    }

    const { isCreated } = await createUserBookmark({
      user: context.user,
      memeId
    })

    if (isCreated) {
      recordActivityEvent({
        type: ActivityEventType.BOOKMARK_ADDED,
        actor: context.user,
        headers: getRequest().headers,
        memeId
      })
    }

    return { isBookmarked }
  })
