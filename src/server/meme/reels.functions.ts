import { randomInt } from 'node:crypto'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { COOKIE_REELS_POSITION_KEY } from '~/constants/cookie'
import { MEME_VIDEO_INCLUDE } from '~/constants/meme'
import { MEME_FILL_OMIT } from '~/constants/meme-fill'
import { RATE_LIMIT_REELS } from '~/constants/rate-limit'
import {
  MAX_REELS_SEED,
  REELS_CURSOR_SCHEMA,
  REELS_PAGE_SIZE,
  type ReelsCursor
} from '~/constants/reels'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import type { MemeContentLocale } from '~/db/generated/prisma/enums'
import { localizeMeme, VISIBLE_CONTENT_LOCALES } from '~/helpers/i18n-content'
import { withDefaultMemeTitle } from '~/helpers/meme'
import { parseReelsPositionCookie, toNextReelsCursor } from '~/helpers/reels'
import { getLocale } from '~/paraglide/runtime'
import { buildSignedStreamUrl } from '~/server/platforms/bunny.server'
import { createRateLimitMiddleware } from '~/server/rate-limit/rate-limit.middleware'

const findShuffledMemeIds = createServerOnlyFn(
  (
    { seed, offset }: NonNullable<ReelsCursor>,
    visibleContentLocales: MemeContentLocale[]
  ) => {
    return prismaClient.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "meme"
      WHERE "status" = 'PUBLISHED'
      AND "content_locale" IN (${Prisma.join(visibleContentLocales)})
      ORDER BY md5("id" || ${String(seed)})
      LIMIT ${REELS_PAGE_SIZE} OFFSET ${offset}
    `
  }
)

const findReelsPage = createServerOnlyFn(
  async (
    requestedCursor: NonNullable<ReelsCursor>,
    visibleContentLocales: MemeContentLocale[]
  ) => {
    const requestedIds = await findShuffledMemeIds(
      requestedCursor,
      visibleContentLocales
    )
    const nextShuffleCursor = toNextReelsCursor(requestedCursor, 0)

    if (requestedIds.length > 0 || nextShuffleCursor === null) {
      return { cursor: requestedCursor, shuffledIds: requestedIds }
    }

    return {
      cursor: nextShuffleCursor,
      shuffledIds: await findShuffledMemeIds(
        nextShuffleCursor,
        visibleContentLocales
      )
    }
  }
)

export const listReels = createServerFn({ method: 'GET' })
  .validator(REELS_CURSOR_SCHEMA)
  .middleware([createRateLimitMiddleware(RATE_LIMIT_REELS)])
  .handler(async ({ data }) => {
    const locale = getLocale()
    const { cursor, shuffledIds } = await findReelsPage(
      data ??
        parseReelsPositionCookie(getCookie(COOKIE_REELS_POSITION_KEY)) ?? {
          seed: randomInt(MAX_REELS_SEED),
          offset: 0
        },
      VISIBLE_CONTENT_LOCALES[locale]
    )

    const memes = await prismaClient.meme.findMany({
      where: {
        id: {
          in: shuffledIds.map(({ id }) => {
            return id
          })
        }
      },
      include: { ...MEME_VIDEO_INCLUDE, translations: true },
      omit: MEME_FILL_OMIT
    })

    const memeById = new Map(
      memes.map((meme) => {
        return [meme.id, meme] as const
      })
    )

    const reels = await Promise.all(
      shuffledIds
        .map(({ id }) => {
          return memeById.get(id)
        })
        .filter((meme) => {
          return meme !== undefined
        })
        .map(async (meme) => {
          return {
            meme: withDefaultMemeTitle(localizeMeme(meme, locale)),
            streamUrl: await buildSignedStreamUrl(meme.video.bunnyId)
          }
        })
    )

    return {
      reels,
      cursor,
      signedAt: Date.now(),
      nextCursor: toNextReelsCursor(cursor, shuffledIds.length)
    }
  })
