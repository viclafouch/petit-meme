import { z } from 'zod'
import { setResponseStatus } from '@tanstack/react-start/server'
import { HTTP_STATUS } from '~/constants/http'
import { MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import {
  MEME_FORM_SCHEMA,
  PUBLISHABLE_MEME_FORM_SCHEMA
} from '~/constants/meme-form'
import { prismaClient } from '~/db/client.server'
import { type MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import {
  CONTENT_LOCALE_TO_LOCALE,
  REQUIRED_TRANSLATION_LOCALES
} from '~/helpers/i18n-content'
import { normalizeKeywords } from '~/helpers/keywords'
import { invalidateAlgoliaCache } from '~/lib/algolia-cache.server'
import { safeAlgoliaOp, syncMemeToAllIndices } from '~/lib/algolia.server'
import { adminLogger } from '~/lib/logger'
import { logAuditAction } from '~/server/audit.server'

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

type MemeEditValues = z.infer<typeof MEME_FORM_SCHEMA> & { id: string }

type EditMemeRecordParams = {
  values: MemeEditValues
  adminId: string
}

export async function editMemeRecord({
  values,
  adminId
}: EditMemeRecordParams) {
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
    setResponseStatus(HTTP_STATUS.NOT_FOUND)
    throw new Error('Mème introuvable')
  }

  const isPublished = meme.status === MemeStatus.PUBLISHED

  if (isPublished && !PUBLISHABLE_MEME_FORM_SCHEMA.safeParse(values).success) {
    setResponseStatus(HTTP_STATUS.UNPROCESSABLE_CONTENT)
    throw new Error('Un Meme en ligne garde un titre dans chaque langue')
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
      fillWrittenAt: null,
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
    actingAdminId: adminId,
    targetId: memeUpdated.id,
    targetType: 'meme',
    metadata: { title: sourceTranslation.title }
  })

  adminLogger.info({ memeId: memeUpdated.id }, 'Meme edited')

  return { id: memeUpdated.id }
}
