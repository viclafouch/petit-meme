import { z } from 'zod'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { HTTP_STATUS } from '~/constants/http'
import {
  ADMIN_MEMES_FILTERS_SCHEMA,
  type AdminMemesFilters,
  MEME_ALGOLIA_INCLUDE,
  MEME_FULL_INCLUDE,
  MEMES_PER_PAGE
} from '~/constants/meme'
import {
  MEME_FORM_SCHEMA,
  PUBLISHABLE_MEME_FORM_SCHEMA,
  REQUIRED_MEME_TRANSLATION_SCHEMA
} from '~/constants/meme-form'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { type MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import {
  CONTENT_LOCALE_TO_LOCALE,
  REQUIRED_TRANSLATION_LOCALES
} from '~/helpers/i18n-content'
import { normalizeKeywords } from '~/helpers/keywords'
import { adminLogger } from '~/lib/logger'
import { baseLocale } from '~/paraglide/runtime'
import { READY_MEME_DRAFT_WHERE } from '~/server/admin/ai-assist/meme-fill.server'
import { logAuditAction } from '~/server/admin/audit/audit.server'
import { adminRequiredMiddleware } from '~/server/auth/auth.middleware'
import { throwWithStatus } from '~/server/http/http.server'
import {
  deleteMemeFiles,
  findMissingMemeFiles
} from '~/server/meme/meme-file.server'
import {
  buildMemeRecord,
  deleteMemeFromAllIndices,
  searchAdminMemes,
  syncMemeToAllIndices,
  type MemeRecord
} from '~/server/meme/meme-index.server'
import { clearRecommendCache } from '~/server/meme/recommend-cache.server'
import { invalidateAlgoliaCache } from '~/server/platforms/algolia-cache.server'
import {
  resolveAlgoliaIndexName,
  resolveAlgoliaReplicaCreated,
  safeAlgoliaOp
} from '~/server/platforms/algolia.server'

const throwMemeNotFound = () => {
  return throwWithStatus(HTTP_STATUS.NOT_FOUND, new Error('Mème introuvable'))
}

export const getAdminMeme = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.string().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: memeId }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: memeId },
      include: MEME_FULL_INCLUDE
    })

    if (!meme) {
      throw notFound()
    }

    return meme
  })

export const getAdminVideoStatus = createServerFn({ method: 'GET' })
  .validator((data) => {
    return z.number().parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: videoId }) => {
    const video = await prismaClient.video.findUnique({
      where: { id: videoId },
      select: { bunnyStatus: true }
    })

    if (!video) {
      throw notFound()
    }

    return { status: video.bunnyStatus }
  })

const INITIAL_VIEW_COUNT_MIN = 30
const INITIAL_VIEW_COUNT_MAX = 120

const resolveGoLiveViewCount = (viewCount: number) => {
  if (viewCount > 0) {
    return viewCount
  }

  const range = INITIAL_VIEW_COUNT_MAX - INITIAL_VIEW_COUNT_MIN + 1

  return Math.floor(Math.random() * range) + INITIAL_VIEW_COUNT_MIN
}

const computeCategoryDiff = (currentIds: string[], newIds: string[]) => {
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

const resolveSourceTranslation = (
  contentLocale: MemeContentLocale,
  translations: MemeFormTranslations
) => {
  const sourceLocale = CONTENT_LOCALE_TO_LOCALE[contentLocale]

  return translations[sourceLocale]
}

type BuildTranslationUpsertsParams = {
  memeId: string
  contentLocale: MemeContentLocale
  translations: MemeFormTranslations
}

const buildTranslationUpserts = ({
  memeId,
  contentLocale,
  translations
}: BuildTranslationUpsertsParams) => {
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

export const updateMeme = createServerFn({ method: 'POST' })
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
        categories: { select: { categoryId: true } }
      }
    })

    if (!meme) {
      adminLogger.warn({ memeId: values.id }, 'Meme not found for edit')

      return throwMemeNotFound()
    }

    const isPublished = meme.status === MemeStatus.PUBLISHED

    if (
      isPublished &&
      !PUBLISHABLE_MEME_FORM_SCHEMA.safeParse(values).success
    ) {
      return throwWithStatus(
        HTTP_STATUS.UNPROCESSABLE_CONTENT,
        new Error('Un Meme en ligne garde un titre dans chaque langue')
      )
    }

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

    if (isPublished) {
      await invalidateAlgoliaCache()
    }

    void logAuditAction({
      action: 'edit',
      actingAdminId: context.user.id,
      targetId: memeUpdated.id,
      targetType: 'meme',
      metadata: { title: sourceTranslation.title }
    })

    adminLogger.info({ memeId: memeUpdated.id }, 'Meme edited')

    return { id: memeUpdated.id }
  })

export const updateMemeStatus = createServerFn({ method: 'POST' })
  .validator((data) => {
    return z.object({ id: z.string(), status: z.enum(MemeStatus) }).parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data, context }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: data.id },
      select: {
        status: true,
        title: true,
        viewCount: true,
        contentLocale: true,
        translations: { select: { locale: true, title: true } },
        video: { select: { bunnyId: true } }
      }
    })

    if (!meme) {
      adminLogger.warn({ memeId: data.id }, 'Meme not found for status change')

      return throwMemeNotFound()
    }

    if (meme.status === data.status) {
      return { id: data.id }
    }

    const isGoingLive = data.status === MemeStatus.PUBLISHED
    const isLeavingSite = meme.status === MemeStatus.PUBLISHED

    if (isGoingLive) {
      const untitledLocales = REQUIRED_TRANSLATION_LOCALES[
        meme.contentLocale
      ].filter((locale) => {
        const translation = meme.translations.find((candidate) => {
          return candidate.locale === locale
        })

        return !REQUIRED_MEME_TRANSLATION_SCHEMA.shape.title.safeParse(
          translation?.title
        ).success
      })

      if (untitledLocales.length > 0) {
        return throwWithStatus(
          HTTP_STATUS.UNPROCESSABLE_CONTENT,
          new Error(
            `Impossible de publier : titre manquant (${untitledLocales.join(', ')})`
          )
        )
      }

      const missingFiles = await findMissingMemeFiles(meme.video.bunnyId)

      if (missingFiles.length > 0) {
        return throwWithStatus(
          HTTP_STATUS.UNPROCESSABLE_CONTENT,
          new Error(
            `Impossible de publier : fichier manquant (${missingFiles.join(', ')})`
          )
        )
      }
    }

    const memeUpdated = await prismaClient.meme.update({
      where: { id: data.id },
      data: {
        status: data.status,
        publishedAt: isGoingLive ? new Date() : null,
        viewCount: isGoingLive
          ? resolveGoLiveViewCount(meme.viewCount)
          : meme.viewCount
      },
      include: MEME_ALGOLIA_INCLUDE
    })

    await safeAlgoliaOp(syncMemeToAllIndices(memeUpdated))

    if (isGoingLive || isLeavingSite) {
      await invalidateAlgoliaCache()
    }

    if (isLeavingSite) {
      void clearRecommendCache()
    }

    void logAuditAction({
      action: 'status_change',
      actingAdminId: context.user.id,
      targetId: memeUpdated.id,
      targetType: 'meme',
      metadata: { title: meme.title, from: meme.status, to: data.status }
    })

    adminLogger.info(
      { memeId: memeUpdated.id, from: meme.status, to: data.status },
      'Meme status changed'
    )

    return { id: memeUpdated.id }
  })

export const deleteMeme = createServerFn({ method: 'POST' })
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

      return throwMemeNotFound()
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

export type AdminMemeRecord = MemeRecord & {
  bookmarkCount: number
}

type AdminMemesSearch = AdminMemesFilters & {
  pageIndex: number
}

const searchReadyDrafts = async ({
  pageIndex,
  ...filters
}: AdminMemesSearch) => {
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
      return buildMemeRecord(meme, baseLocale)
    }),
    page: pageIndex,
    totalPages: Math.ceil(total / MEMES_PER_PAGE)
  }
}

const searchIndexedMemes = ({ pageIndex, ...filters }: AdminMemesSearch) => {
  const filterParts = [
    filters.status === undefined ? undefined : `status:${filters.status}`,
    filters.contentLocale === undefined
      ? undefined
      : `contentLocale:${filters.contentLocale}`
  ].filter(Boolean)

  return searchAdminMemes({
    indexName: filters.query
      ? resolveAlgoliaIndexName(baseLocale)
      : resolveAlgoliaReplicaCreated(baseLocale),
    query: filters.query,
    page: pageIndex,
    hitsPerPage: MEMES_PER_PAGE,
    filters: filterParts.length > 0 ? filterParts.join(' AND ') : undefined
  })
}

export const listAdminMemes = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .validator(ADMIN_MEMES_FILTERS_SCHEMA)
  .handler(async ({ data }) => {
    const search = {
      ...data,
      pageIndex: data.page === undefined ? 0 : data.page - 1
    }
    const { hits, page, totalPages } = data.ready
      ? await searchReadyDrafts(search)
      : await searchIndexedMemes(search)
    const memeIds = hits.map((hit) => {
      return hit.id
    })

    const bookmarkCounts = await prismaClient.bookmark.groupBy({
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
