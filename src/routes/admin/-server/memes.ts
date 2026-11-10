import { filesize } from 'filesize'
import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { HTTP_STATUS } from '~/constants/http'
import {
  ADMIN_MEMES_FILTERS_SCHEMA,
  type AdminMemesFilters,
  DEFAULT_MEME_TITLE,
  MAX_SIZE_MEME_IN_BYTES,
  MEME_ALGOLIA_INCLUDE,
  MEME_FULL_INCLUDE,
  MEMES_PER_PAGE
} from '~/constants/meme'
import { READY_MEME_DRAFT_WHERE } from '~/constants/meme-fill'
import { MEME_FILL_SUGGESTION_SCHEMA } from '~/constants/meme-fill-suggestion'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import {
  type MemeContentLocale,
  MemeContentLocale as MemeContentLocaleEnum,
  MemeFillStatus,
  MemeStatus
} from '~/db/generated/prisma/enums'
import {
  buildLocaleRecord,
  CONTENT_LOCALE_TO_LOCALE,
  REQUIRED_TRANSLATION_LOCALES
} from '~/helpers/i18n-content'
import { normalizeKeywords } from '~/helpers/keywords'
import { invalidateAlgoliaCache } from '~/lib/algolia-cache.server'
import {
  ALGOLIA_ADMIN_SEARCH_PARAMS,
  getAlgoliaSearchClient,
  deleteMemeFromAllIndices,
  memeToAlgoliaRecord,
  normalizeAlgoliaHit,
  resolveAlgoliaIndexName,
  resolveAlgoliaReplicaCreated,
  safeAlgoliaOp,
  syncMemeToAllIndices,
  type AlgoliaMemeRecord
} from '~/lib/algolia.server'
import { createVideo, uploadVideo } from '~/lib/bunny.server'
import { adminLogger } from '~/lib/logger'
import { deleteMemeFiles, findMissingMemeFiles } from '~/lib/meme-files.server'
import { getTweetByUrl, getTweetMedia } from '~/lib/react-tweet'
import { captureWithFeature } from '~/lib/sentry'
import { baseLocale } from '~/paraglide/runtime'
import { logAuditAction } from '~/server/audit.server'
import { clearRecommendCache } from '~/server/meme'
import { adminRequiredMiddleware } from '~/server/user-auth'

const ALGOLIA_STATUS_FILTERS = {
  [MemeStatus.PENDING]: 'status:PENDING',
  [MemeStatus.PUBLISHED]: 'status:PUBLISHED',
  [MemeStatus.REJECTED]: 'status:REJECTED',
  [MemeStatus.ARCHIVED]: 'status:ARCHIVED'
} as const satisfies Record<MemeStatus, string>

const ALGOLIA_CONTENT_LOCALE_FILTERS = {
  [MemeContentLocaleEnum.FR]: 'contentLocale:FR',
  [MemeContentLocaleEnum.EN]: 'contentLocale:EN',
  [MemeContentLocaleEnum.UNIVERSAL]: 'contentLocale:UNIVERSAL'
} as const satisfies Record<MemeContentLocale, string>

export const getAdminMemeById = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: memeId
      },
      include: MEME_FULL_INCLUDE
    })

    if (!meme) {
      throw notFound()
    }

    return meme
  })

export const getAdminMemeFill = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      select: {
        fillStatus: true,
        fillDoubt: true,
        fillSuggestion: true,
        updatedAt: true
      }
    })

    if (!meme) {
      throw notFound()
    }

    const suggestion = MEME_FILL_SUGGESTION_SCHEMA.safeParse(
      meme.fillSuggestion
    )

    return {
      status: meme.fillStatus,
      doubt: meme.fillDoubt,
      suggestion: suggestion.success ? suggestion.data : null,
      updatedAt: meme.updatedAt
    }
  })

export const keepMemeFillSuggestion = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z
      .object({ memeId: z.string(), suggestion: MEME_FILL_SUGGESTION_SCHEMA })
      .parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data }) => {
    await prismaClient.meme.updateMany({
      where: { id: data.memeId, fillStatus: MemeFillStatus.FILLED },
      data: { fillSuggestion: data.suggestion }
    })
  })

export const settleMemeFillSuggestion = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.object({ memeId: z.string(), isApplied: z.boolean() }).parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data }) => {
    await prismaClient.meme.updateMany({
      where: { id: data.memeId, fillStatus: MemeFillStatus.FILLED },
      data: data.isApplied
        ? { fillSuggestion: Prisma.DbNull }
        : {
            fillSuggestion: Prisma.DbNull,
            fillStatus: MemeFillStatus.NONE,
            fillDoubt: ''
          }
    })
  })

export const MEME_DESCRIPTION_MAX_LENGTH = 200

export const MEME_TITLE_MIN_LENGTH = 3
const MEME_TITLE_MAX_LENGTH = 100
const MEME_KEYWORD_MAX_LENGTH = 50
const MEME_KEYWORDS_MAX_COUNT = 20
const MEME_CATEGORIES_MAX_COUNT = 10

const MEME_TRANSLATION_SCHEMA = z.object({
  title: z.string().max(MEME_TITLE_MAX_LENGTH),
  description: z.string().max(MEME_DESCRIPTION_MAX_LENGTH),
  keywords: z
    .array(z.string().max(MEME_KEYWORD_MAX_LENGTH))
    .max(MEME_KEYWORDS_MAX_COUNT)
})

const REQUIRED_MEME_TRANSLATION_SCHEMA = MEME_TRANSLATION_SCHEMA.extend({
  title: z.string().min(MEME_TITLE_MIN_LENGTH).max(MEME_TITLE_MAX_LENGTH)
})

export const MEME_FORM_SCHEMA = z
  .object({
    contentLocale: z.enum(MemeContentLocaleEnum),
    translations: z.object(
      buildLocaleRecord(() => {
        return MEME_TRANSLATION_SCHEMA
      })
    ),
    categoryIds: z.array(z.string()).max(MEME_CATEGORIES_MAX_COUNT),
    status: z.enum(MemeStatus),
    tweetUrl: TWEET_LINK_SCHEMA.nullable().or(
      z
        .string()
        .length(0)
        .transform(() => {
          return null
        })
    )
  })
  .superRefine((data, refinementContext) => {
    if (data.status !== MemeStatus.PUBLISHED) {
      return
    }

    const requiredLocales = REQUIRED_TRANSLATION_LOCALES[data.contentLocale]

    for (const locale of requiredLocales) {
      const result = REQUIRED_MEME_TRANSLATION_SCHEMA.safeParse(
        data.translations[locale]
      )

      if (!result.success) {
        for (const issue of result.error.issues) {
          refinementContext.addIssue({
            ...issue,
            path: ['translations', locale, ...issue.path]
          })
        }
      }
    }
  })

function resolvePublishedAt(
  newStatus: string,
  meme: { status: string; publishedAt: Date | null }
) {
  if (newStatus === 'PUBLISHED' && meme.status !== 'PUBLISHED') {
    return new Date()
  }

  if (newStatus !== 'PUBLISHED') {
    return null
  }

  return meme.publishedAt
}

const INITIAL_VIEW_COUNT_MIN = 30
const INITIAL_VIEW_COUNT_MAX = 120

function resolveInitialViewCount(
  newStatus: string,
  meme: { status: string; viewCount: number }
) {
  const isFirstPublish =
    newStatus === 'PUBLISHED' && meme.status !== 'PUBLISHED'

  if (isFirstPublish && meme.viewCount === 0) {
    const range = INITIAL_VIEW_COUNT_MAX - INITIAL_VIEW_COUNT_MIN + 1

    return Math.floor(Math.random() * range) + INITIAL_VIEW_COUNT_MIN
  }

  return meme.viewCount
}

function computeCategoryDiff(currentIds: string[], newIds: string[]) {
  const currentSet = new Set(currentIds)
  const newSet = new Set(newIds)

  return {
    toAdd: newIds.filter((id) => {
      return !currentSet.has(id)
    }),
    toRemove: currentIds.filter((id) => {
      return !newSet.has(id)
    })
  }
}

type MemeFormTranslations = z.infer<typeof MEME_FORM_SCHEMA>['translations']

function resolveSourceTranslation(
  contentLocale: MemeContentLocale,
  translations: MemeFormTranslations
) {
  const sourceLocale = CONTENT_LOCALE_TO_LOCALE[contentLocale]

  return translations[sourceLocale]
}

type BuildTranslationUpsertsParams = {
  memeId: string
  contentLocale: MemeContentLocale
  translations: MemeFormTranslations
}

function buildTranslationUpserts({
  memeId,
  contentLocale,
  translations
}: BuildTranslationUpsertsParams) {
  const requiredLocales = REQUIRED_TRANSLATION_LOCALES[contentLocale]

  return requiredLocales.map((locale) => {
    const data = translations[locale]
    const normalizedKeywords = normalizeKeywords(data.keywords)

    return {
      where: { memeId_locale: { memeId, locale } },
      update: {
        title: data.title,
        description: data.description,
        keywords: normalizedKeywords
      },
      create: {
        locale,
        title: data.title,
        description: data.description,
        keywords: normalizedKeywords
      }
    }
  })
}

export const editMeme = createServerFn({ method: 'POST' })
  .validator((data) => {
    return MEME_FORM_SCHEMA.extend({ id: z.string() }).parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: values, context }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: values.id
      },
      select: {
        status: true,
        publishedAt: true,
        viewCount: true,
        video: { select: { bunnyId: true } },
        categories: { select: { categoryId: true } }
      }
    })

    if (!meme) {
      adminLogger.warn({ memeId: values.id }, 'Meme not found for edit')
      setResponseStatus(HTTP_STATUS.NOT_FOUND)
      throw new Error('Mème introuvable')
    }

    const isGoingLive =
      values.status === MemeStatus.PUBLISHED &&
      meme.status !== MemeStatus.PUBLISHED

    if (isGoingLive) {
      const missingFiles = await findMissingMemeFiles(meme.video.bunnyId)

      if (missingFiles.length > 0) {
        setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
        throw new Error(
          `Impossible de publier : fichier manquant (${missingFiles.join(', ')})`
        )
      }
    }

    const publishedAt = resolvePublishedAt(values.status, meme)
    const viewCount = resolveInitialViewCount(values.status, meme)

    const currentCategoryIds = meme.categories.map(({ categoryId }) => {
      return categoryId
    })
    const { toAdd, toRemove } = computeCategoryDiff(
      currentCategoryIds,
      values.categoryIds
    )

    const sourceTranslation = resolveSourceTranslation(
      values.contentLocale,
      values.translations
    )
    const requiredLocales = REQUIRED_TRANSLATION_LOCALES[values.contentLocale]

    const memeUpdated = await prismaClient.meme.update({
      where: {
        id: values.id
      },
      data: {
        contentLocale: values.contentLocale,
        title: sourceTranslation.title,
        description: sourceTranslation.description,
        status: values.status,
        publishedAt,
        viewCount,
        categories: {
          deleteMany:
            toRemove.length > 0 ? { categoryId: { in: toRemove } } : undefined,
          create: toAdd.map((categoryId) => {
            return {
              category: {
                connect: { id: categoryId }
              }
            }
          })
        },
        keywords: normalizeKeywords(sourceTranslation.keywords),
        tweetUrl: values.tweetUrl ?? null,
        translations: {
          upsert: buildTranslationUpserts({
            memeId: values.id,
            contentLocale: values.contentLocale,
            translations: values.translations
          }),
          deleteMany: {
            locale: { notIn: [...requiredLocales] }
          }
        }
      },
      include: MEME_ALGOLIA_INCLUDE
    })

    await safeAlgoliaOp(syncMemeToAllIndices(memeUpdated))

    const isPubliclyVisible =
      meme.status === MemeStatus.PUBLISHED ||
      values.status === MemeStatus.PUBLISHED

    if (isPubliclyVisible) {
      await invalidateAlgoliaCache()
    }

    const hasLeftPublished =
      meme.status === MemeStatus.PUBLISHED &&
      values.status !== MemeStatus.PUBLISHED

    if (hasLeftPublished) {
      void clearRecommendCache()
    }

    const hasStatusChanged = meme.status !== values.status

    void logAuditAction({
      action: 'edit',
      actingAdminId: context.user.id,
      targetId: memeUpdated.id,
      targetType: 'meme',
      metadata: { title: sourceTranslation.title }
    })

    if (hasStatusChanged) {
      void logAuditAction({
        action: 'status_change',
        actingAdminId: context.user.id,
        targetId: memeUpdated.id,
        targetType: 'meme',
        metadata: {
          title: sourceTranslation.title,
          from: meme.status,
          to: values.status
        }
      })
    }

    adminLogger.info(
      { memeId: memeUpdated.id, status: values.status },
      'Meme edited'
    )

    return { id: memeUpdated.id }
  })

export const deleteMemeById = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId, context }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      select: {
        id: true,
        title: true,
        videoId: true,
        video: { select: { bunnyId: true } }
      }
    })

    if (!meme) {
      adminLogger.warn({ memeId }, 'Meme not found for deletion')
      setResponseStatus(HTTP_STATUS.NOT_FOUND)
      throw new Error('Mème introuvable')
    }

    await prismaClient.$transaction([
      prismaClient.meme.delete({ where: { id: memeId } }),
      prismaClient.video.delete({ where: { id: meme.videoId } })
    ])

    const [, undeletedFiles] = await Promise.all([
      safeAlgoliaOp(deleteMemeFromAllIndices(meme.id)),
      deleteMemeFiles(meme.video.bunnyId)
    ])

    await invalidateAlgoliaCache()
    void clearRecommendCache()

    void logAuditAction({
      action: 'delete',
      actingAdminId: context.user.id,
      targetId: meme.id,
      targetType: 'meme',
      metadata: { title: meme.title }
    })

    adminLogger.info({ memeId: meme.id, undeletedFiles }, 'Meme deleted')

    return { id: meme.id, undeletedFiles }
  })

type CreateMemeWithVideoParams = {
  buffer: Buffer<ArrayBuffer>
  adminId: string
  tweetUrl?: string
}

async function rollbackMemeCreation(memeId: string, bunnyId: string) {
  await Promise.all([
    prismaClient.meme
      .delete({ where: { id: memeId } })
      .catch((cleanupError: unknown) => {
        adminLogger.error(
          { error: cleanupError, memeId },
          'Failed to rollback meme from DB'
        )
      }),
    safeAlgoliaOp(deleteMemeFromAllIndices(memeId)),
    deleteMemeFiles(bunnyId)
  ])
}

async function createMemeWithVideo({
  buffer,
  tweetUrl,
  adminId
}: CreateMemeWithVideoParams) {
  const title = DEFAULT_MEME_TITLE
  const { videoId } = await createVideo(title)
  let meme

  try {
    meme = await prismaClient.meme.create({
      data: {
        title,
        tweetUrl,
        status: 'PENDING',
        fillStatus: MemeFillStatus.WAITING,
        contentLocale: MemeContentLocaleEnum.FR,
        video: {
          create: {
            duration: 0,
            bunnyId: videoId
          }
        },
        translations: {
          create: {
            locale: baseLocale,
            title,
            description: '',
            keywords: []
          }
        }
      },
      include: MEME_ALGOLIA_INCLUDE
    })
  } catch (error) {
    await deleteMemeFiles(videoId)
    throw error
  }

  try {
    await Promise.all([
      safeAlgoliaOp(syncMemeToAllIndices(meme)),
      uploadVideo(videoId, buffer)
    ])
  } catch (error) {
    captureWithFeature(error, 'admin-meme-edit')
    adminLogger.error(
      { error, memeId: meme.id, bunnyVideoId: videoId },
      'Upload/Algolia failed after DB create, rolling back'
    )
    await rollbackMemeCreation(meme.id, videoId)
    throw error
  }

  await invalidateAlgoliaCache()

  void logAuditAction({
    action: 'create',
    actingAdminId: adminId,
    targetId: meme.id,
    targetType: 'meme',
    metadata: {
      title,
      source: tweetUrl ? 'twitter' : 'upload'
    }
  })

  adminLogger.info({ memeId: meme.id, tweetUrl }, 'Meme created')

  return { id: meme.id }
}

export const createMemeFromTwitterUrl = createServerFn({ method: 'POST' })
  .validator((url: string) => {
    return TWEET_LINK_SCHEMA.parse(url)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: url, context }) => {
    const tweet = await getTweetByUrl(url)
    const media = await getTweetMedia(tweet.video.url, tweet.poster.url)

    if (media.video.blob.size > MAX_SIZE_MEME_IN_BYTES) {
      adminLogger.warn(
        { tweetId: tweet.id, size: filesize(media.video.blob.size) },
        'Video size too big from Twitter'
      )
      setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
      throw new Error(
        `La vidéo est trop volumineuse : ${filesize(media.video.blob.size)}`
      )
    }

    const buffer = Buffer.from(await media.video.blob.arrayBuffer())

    return createMemeWithVideo({
      buffer,
      tweetUrl: tweet.url,
      adminId: context.user.id
    })
  })

export const CREATE_MEME_FROM_FILE_SCHEMA = z.object({
  video: z.file().min(1).max(MAX_SIZE_MEME_IN_BYTES).mime('video/mp4')
})

export const createMemeFromFile = createServerFn({ method: 'POST' })
  .validator((data) => {
    const formData = z.instanceof(FormData).parse(data)

    return CREATE_MEME_FROM_FILE_SCHEMA.parse({
      video: formData.get('video')
    })
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: values, context }) => {
    const buffer = Buffer.from(await values.video.arrayBuffer())

    return createMemeWithVideo({ buffer, adminId: context.user.id })
  })

export type AdminMemeRecord = AlgoliaMemeRecord & {
  bookmarkCount: number
}

type AdminMemesSearch = AdminMemesFilters & {
  pageIndex: number
}

async function searchReadyDrafts({ pageIndex, ...filters }: AdminMemesSearch) {
  const where = {
    ...READY_MEME_DRAFT_WHERE,
    contentLocale: filters.contentLocale,
    title: filters.query
      ? { contains: filters.query, mode: 'insensitive' }
      : undefined
  } satisfies Prisma.MemeWhereInput
  const memes = await prismaClient.meme.findMany({
    where,
    include: MEME_ALGOLIA_INCLUDE,
    orderBy: { updatedAt: 'asc' },
    skip: pageIndex * MEMES_PER_PAGE,
    take: MEMES_PER_PAGE
  })
  const total = await prismaClient.meme.count({ where })

  return {
    hits: memes.map((meme) => {
      return memeToAlgoliaRecord(meme, baseLocale)
    }),
    page: pageIndex,
    totalPages: Math.ceil(total / MEMES_PER_PAGE)
  }
}

async function searchAlgoliaMemes({ pageIndex, ...filters }: AdminMemesSearch) {
  const filterParts: string[] = []

  if (filters.status !== undefined) {
    filterParts.push(ALGOLIA_STATUS_FILTERS[filters.status])
  }

  if (filters.contentLocale !== undefined) {
    filterParts.push(ALGOLIA_CONTENT_LOCALE_FILTERS[filters.contentLocale])
  }

  const response =
    await getAlgoliaSearchClient().searchSingleIndex<AlgoliaMemeRecord>({
      indexName: filters.query
        ? resolveAlgoliaIndexName(baseLocale)
        : resolveAlgoliaReplicaCreated(baseLocale),
      searchParams: {
        query: filters.query,
        page: pageIndex,
        hitsPerPage: MEMES_PER_PAGE,
        filters: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
        ...ALGOLIA_ADMIN_SEARCH_PARAMS
      }
    })

  return {
    hits: response.hits.map(normalizeAlgoliaHit),
    page: response.page,
    totalPages: response.nbPages
  }
}

export const getAdminMemes = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(ADMIN_MEMES_FILTERS_SCHEMA)
  .handler(async ({ data }) => {
    const search = {
      ...data,
      pageIndex: data.page === undefined ? 0 : data.page - 1
    }
    const { hits, page, totalPages } = data.ready
      ? await searchReadyDrafts(search)
      : await searchAlgoliaMemes(search)
    const memeIds = hits.map((hit) => {
      return hit.id
    })

    const bookmarkCounts = await prismaClient.userBookmark.groupBy({
      by: ['memeId'],
      where: { memeId: { in: memeIds } },
      _count: { id: true }
    })

    const bookmarkCountByMemeId = new Map(
      bookmarkCounts.map((group) => {
        return [group.memeId, group._count.id] as const
      })
    )

    return {
      memes: hits.map((hit) => {
        return {
          ...hit,
          bookmarkCount: bookmarkCountByMemeId.get(hit.id) ?? 0
        } satisfies AdminMemeRecord
      }),
      query: data.query,
      page,
      totalPages
    }
  })
