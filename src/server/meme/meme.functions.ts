import { createHash } from 'node:crypto'
import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { MEME_DERIVED_FORMATS } from '~/constants/bunny'
import {
  DEFAULT_MEME_TITLE,
  MEME_EXPORT_MODES,
  MEME_FULL_INCLUDE,
  MEME_VIDEO_INTENTS,
  MEMES_SEARCH_SCHEMA,
  type MemeVideoIntent
} from '~/constants/meme'
import {
  RATE_LIMIT_DOWNLOAD,
  RATE_LIMIT_PLAYBACK,
  RATE_LIMIT_TRACK,
  RATE_LIMIT_VIEW
} from '~/constants/rate-limit'
import { HOUR } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import {
  ActivityEventType as ActivityEventTypeEnum,
  MemeStatus,
  type ActivityEventType
} from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server.server'
import { truncateToUtcDay } from '~/helpers/date'
import {
  localizeCategory,
  localizeMeme,
  parseContentLocalesParam,
  resolveVisibleContentLocales
} from '~/helpers/i18n-content'
import { extractClientIp } from '~/helpers/request'
import { matchCanViewMeme, matchIsUserAdmin } from '~/helpers/role'
import { ensureAlgoliaUserToken } from '~/lib/algolia-user-token'
import { matchIsAnalyticsConsentGiven } from '~/lib/cookie-consent'
import { logger } from '~/lib/logger'
import { getLocale } from '~/paraglide/runtime'
import { recordActivityEvent } from '~/server/activity/activity.server'
import { findCachedSession } from '~/server/auth/auth.server'
import { serveMemeExport } from '~/server/meme/meme-file.server'
import {
  getAlgoliaInsightsClient,
  resolveAlgoliaIndexName,
  safeAlgoliaOp
} from '~/server/platforms/algolia.server'
import { buildSignedStreamUrl } from '~/server/platforms/bunny.server'
import { createRateLimitMiddleware } from '~/server/rate-limit/rate-limit.middleware'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

const ISO_DAY_LENGTH = 'YYYY-MM-DD'.length

const ACTIVITY_EVENT_TYPE_BY_VIDEO_INTENT = {
  download: ActivityEventTypeEnum.DOWNLOAD,
  share: ActivityEventTypeEnum.SHARE,
  studio: null
} as const satisfies Record<MemeVideoIntent, ActivityEventType | null>

const MEME_EXPORT_FILE_SCHEMA = z.object({
  memeId: z.string(),
  mode: z.enum(MEME_VIDEO_INTENTS),
  format: z.enum(MEME_DERIVED_FORMATS)
})

const MEME_EXPORT_SCHEMA = z.object({
  memeId: z.string(),
  action: z.enum(MEME_EXPORT_MODES)
})

const MEME_VIEW_SCHEMA = z.object({
  memeId: z.string(),
  watchMs: z.number().int().min(0).max(HOUR)
})

const buildVisitorKey = createServerOnlyFn((ipAddress: string, date: Date) => {
  const utcDay = truncateToUtcDay(date).toISOString().slice(0, ISO_DAY_LENGTH)

  return createHash('sha256')
    .update(`${ipAddress}${utcDay}${serverEnv.VISITOR_KEY_SALT}`)
    .digest('hex')
})

const matchCanRequestViewMeme = createServerOnlyFn(
  async (status: MemeStatus) => {
    if (status === MemeStatus.PUBLISHED) {
      return true
    }

    const session = await findCachedSession(getRequest().headers)

    return matchCanViewMeme({ user: session?.user, status })
  }
)

export const getMeme = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      include: MEME_FULL_INCLUDE
    })

    if (!meme || !(await matchCanRequestViewMeme(meme.status))) {
      throw notFound()
    }

    const locale = getLocale()
    const localizedMeme = localizeMeme(meme, locale)

    return {
      ...localizedMeme,
      title:
        localizedMeme.title === '' ? DEFAULT_MEME_TITLE : localizedMeme.title,
      categories: meme.categories.map((memeCategory) => {
        return {
          ...memeCategory,
          category: localizeCategory(memeCategory.category, locale)
        }
      })
    }
  })

export const getMemePlaybackUrl = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([createRateLimitMiddleware(RATE_LIMIT_PLAYBACK)])
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      select: { status: true, video: { select: { bunnyId: true } } }
    })

    if (!meme || !(await matchCanRequestViewMeme(meme.status))) {
      throw notFound()
    }

    return buildSignedStreamUrl(meme.video.bunnyId)
  })

const RANDOM_MEME_SCHEMA = z.object({
  exceptId: z.string().optional(),
  contentLocales: MEMES_SEARCH_SCHEMA.shape.contentLocales
})

export const getRandomMeme = createServerFn({ method: 'GET' })
  .validator((data) => {
    return RANDOM_MEME_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const locale = getLocale()
    const parsedContentLocales = !data.contentLocales
      ? undefined
      : parseContentLocalesParam(data.contentLocales, locale)

    const whereCondition = {
      status: MemeStatus.PUBLISHED,
      contentLocale: {
        in: resolveVisibleContentLocales(locale, parsedContentLocales)
      },
      ...(!data.exceptId ? {} : { id: { not: data.exceptId } })
    }

    const count = await prismaClient.meme.count({ where: whereCondition })

    if (count === 0) {
      return null
    }

    const randomOffset = Math.floor(Math.random() * count)

    const [meme] = await prismaClient.meme.findMany({
      where: whereCondition,
      select: { id: true },
      skip: randomOffset,
      take: 1
    })

    return meme ?? null
  })

export const getMemeExportFile = createServerFn({ method: 'GET' })
  .validator((data) => {
    return MEME_EXPORT_FILE_SCHEMA.parse(data)
  })
  .middleware([createRateLimitMiddleware(RATE_LIMIT_DOWNLOAD)])
  .handler(async ({ data }) => {
    const { memeId, mode, format } = data
    const { headers } = getRequest()

    const [meme, session] = await Promise.all([
      prismaClient.meme.findUnique({
        where: { id: memeId },
        select: { status: true, video: { select: { bunnyId: true } } }
      }),
      findCachedSession(headers)
    ])

    if (
      !meme ||
      !matchCanViewMeme({ user: session?.user, status: meme.status })
    ) {
      throw notFound()
    }

    const isPremium = session ? await matchIsUserPremium(session.user) : false

    const response = await serveMemeExport({
      bunnyId: meme.video.bunnyId,
      format,
      isPremium
    })

    logger.info(
      {
        memeId,
        mode,
        format,
        ip: extractClientIp(headers),
        userAgent: headers.get('user-agent') ?? 'unknown',
        isPremium
      },
      'Meme shared/downloaded'
    )

    const activityEventType = ACTIVITY_EVENT_TYPE_BY_VIDEO_INTENT[mode]

    if (activityEventType !== null) {
      recordActivityEvent({
        type: activityEventType,
        actor: session?.user,
        headers,
        memeId,
        format
      })
    }

    return response
  })

export const recordMemeExport = createServerFn({ method: 'POST' })
  .validator((data) => {
    return MEME_EXPORT_SCHEMA.parse(data)
  })
  .middleware([createRateLimitMiddleware(RATE_LIMIT_TRACK)])
  .handler(async ({ data }) => {
    const { memeId, action } = data
    const countField = action === 'share' ? 'shareCount' : 'downloadCount'
    const day = truncateToUtcDay(new Date())

    await prismaClient.$transaction(async (transaction) => {
      const updated = await transaction.meme.updateMany({
        where: { id: memeId, status: MemeStatus.PUBLISHED },
        data: { [countField]: { increment: 1 } }
      })

      if (updated.count === 0) {
        return
      }

      await transaction.memeActionDaily.upsert({
        where: { memeId_day_action: { memeId, day, action } },
        create: { memeId, day, action, count: 1 },
        update: { count: { increment: 1 } }
      })
    })
  })

export const recordMemeView = createServerFn({ method: 'POST' })
  .validator((data) => {
    return MEME_VIEW_SCHEMA.parse(data)
  })
  .middleware([createRateLimitMiddleware(RATE_LIMIT_VIEW)])
  .handler(async ({ data }) => {
    const { memeId, watchMs } = data
    const { headers } = getRequest()
    const session = await findCachedSession(headers)

    if (session && matchIsUserAdmin(session.user)) {
      return
    }

    const now = new Date()
    const visitorKey = buildVisitorKey(extractClientIp(headers), now)
    const day = truncateToUtcDay(now)

    const viewTransaction = prismaClient.$transaction(async (transaction) => {
      const result = await transaction.memeViewDaily.createMany({
        data: [{ memeId, viewerKey: visitorKey, day, watchMs }],
        skipDuplicates: true
      })

      if (result.count === 1) {
        await transaction.meme.update({
          where: { id: memeId },
          data: { viewCount: { increment: 1 } }
        })
      }
    })

    recordActivityEvent({
      type: ActivityEventTypeEnum.VIEW,
      actor: session?.user,
      headers,
      memeId,
      dedupKey: `${memeId}:${visitorKey}`
    })

    if (matchIsAnalyticsConsentGiven()) {
      void safeAlgoliaOp(
        getAlgoliaInsightsClient().pushEvents({
          events: [
            {
              eventType: 'view',
              eventName: 'Meme Viewed',
              index: resolveAlgoliaIndexName(getLocale()),
              objectIDs: [memeId],
              userToken: ensureAlgoliaUserToken(),
              authenticatedUserToken: session?.user.id
            }
          ]
        })
      )
    }

    await viewTransaction
  })
