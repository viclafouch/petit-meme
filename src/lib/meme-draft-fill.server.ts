import { DEFAULT_MEME_TITLE, MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import { MEME_FILL_MAX_DURATION_SECONDS } from '~/constants/meme-fill'
import { SECOND } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import { MemeFillStatus, MemeStatus } from '~/db/generated/prisma/enums'
import {
  CONTENT_LOCALE_TO_LOCALE,
  REQUIRED_TRANSLATION_LOCALES
} from '~/helpers/i18n-content'
import { normalizeKeywords } from '~/helpers/keywords'
import { withTimeout } from '~/helpers/promise'
import { safeAlgoliaOp, syncMemeToAllIndices } from '~/lib/algolia.server'
import { aiLogger } from '~/lib/logger'
import {
  fetchMemeVideo,
  MEME_DRAFT_LOCALE,
  type MemeDraft,
  type MemeDraftTranslation,
  translateMemeDraft,
  writeMemeDraft
} from '~/lib/meme-draft.server'
import { captureWithFeature } from '~/lib/sentry'
import type { Locale } from '~/paraglide/runtime'

const FILL_MAX_DURATION_MS = MEME_FILL_MAX_DURATION_SECONDS * SECOND
const FILL_RUN_TIMEOUT_MS = 740_000
const FILL_VIDEO_TIMEOUT_MS = 540_000
const FILL_TRANSLATION_TIMEOUT_MS = 120_000

type DraftTranslations = Partial<Record<Locale, MemeDraftTranslation>>

async function translateDraft(draft: MemeDraft) {
  const requiredLocales = REQUIRED_TRANSLATION_LOCALES[draft.contentLocale]
  const targetLocales = requiredLocales.filter((locale) => {
    return locale !== MEME_DRAFT_LOCALE
  })
  const translations: DraftTranslations = { [MEME_DRAFT_LOCALE]: draft }

  if (targetLocales.length === 0) {
    return translations
  }

  const translated = await translateMemeDraft({
    sourceLocale: MEME_DRAFT_LOCALE,
    targetLocales,
    title: draft.title,
    description: draft.description,
    keywords: draft.keywords,
    timeoutMs: FILL_TRANSLATION_TIMEOUT_MS
  })

  return { ...translations, ...translated }
}

function resolveTranslation(translations: DraftTranslations, locale: Locale) {
  const translation = translations[locale]

  if (!translation) {
    throw new Error(`Missing the ${locale} record of the draft`)
  }

  return {
    title: translation.title,
    description: translation.description,
    keywords: normalizeKeywords(translation.keywords)
  }
}

type WriteFilledDraftParams = {
  memeId: string
  draft: MemeDraft
  translations: DraftTranslations
  categoryIds: string[]
}

async function writeFilledDraft({
  memeId,
  draft,
  translations,
  categoryIds
}: WriteFilledDraftParams) {
  const requiredLocales = REQUIRED_TRANSLATION_LOCALES[draft.contentLocale]
  const source = resolveTranslation(
    translations,
    CONTENT_LOCALE_TO_LOCALE[draft.contentLocale]
  )
  const records = requiredLocales.map((locale) => {
    return { locale, ...resolveTranslation(translations, locale) }
  })

  return prismaClient.$transaction(async (transaction) => {
    const { count } = await transaction.meme.updateMany({
      where: {
        id: memeId,
        status: MemeStatus.PENDING,
        title: DEFAULT_MEME_TITLE,
        fillStatus: MemeFillStatus.RUNNING
      },
      data: {
        ...source,
        contentLocale: draft.contentLocale,
        fillStatus: MemeFillStatus.FILLED,
        fillDoubt: draft.doubt
      }
    })

    if (count === 0) {
      return null
    }

    await transaction.memeTranslation.deleteMany({
      where: { memeId, locale: { notIn: [...requiredLocales] } }
    })

    for (const { locale, ...record } of records) {
      // oxlint-disable-next-line no-await-in-loop -- writes in one transaction run one after the other
      await transaction.memeTranslation.upsert({
        where: { memeId_locale: { memeId, locale } },
        update: record,
        create: { memeId, locale, ...record }
      })
    }

    await transaction.memeCategory.createMany({
      data: categoryIds.map((categoryId) => {
        return { memeId, categoryId }
      }),
      skipDuplicates: true
    })

    return transaction.meme.findUniqueOrThrow({
      where: { id: memeId },
      include: MEME_ALGOLIA_INCLUDE
    })
  })
}

async function claimMemeDraft(memeId: string) {
  const { count } = await prismaClient.meme.updateMany({
    where: {
      id: memeId,
      OR: [
        { fillStatus: MemeFillStatus.WAITING },
        {
          fillStatus: MemeFillStatus.RUNNING,
          updatedAt: { lt: new Date(Date.now() - FILL_MAX_DURATION_MS) }
        }
      ]
    },
    data: {
      fillStatus: MemeFillStatus.RUNNING,
      fillAttempts: { increment: 1 }
    }
  })

  return count === 1
}

async function releaseMemeDraft(memeId: string, fillStatus: MemeFillStatus) {
  await prismaClient.meme.updateMany({
    where: { id: memeId, fillStatus: MemeFillStatus.RUNNING },
    data: { fillStatus }
  })
}

async function runClaimedFill(memeId: string) {
  const meme = await prismaClient.meme.findUnique({
    where: { id: memeId },
    select: { video: { select: { bunnyId: true } } }
  })

  if (!meme) {
    aiLogger.info({ memeId }, 'Meme draft fill ended: the Meme is gone')

    return
  }

  const video = await fetchMemeVideo(meme.video.bunnyId)

  if (!video) {
    await releaseMemeDraft(memeId, MemeFillStatus.NONE)
    captureWithFeature(
      new Error(`Bunny has no original for the finished video of ${memeId}`),
      'meme-draft-fill'
    )

    return
  }

  const categories = await prismaClient.category.findMany({
    select: { id: true, slug: true, title: true }
  })
  const draft = await writeMemeDraft({
    video,
    customPrompt: '',
    targetLocale: MEME_DRAFT_LOCALE,
    categories,
    timeoutMs: FILL_VIDEO_TIMEOUT_MS
  })
  const translations = await translateDraft(draft)
  const categoryIds = categories
    .filter(({ slug }) => {
      return draft.categorySlugs.includes(slug)
    })
    .map(({ id }) => {
      return id
    })

  const filledMeme = await writeFilledDraft({
    memeId,
    draft,
    translations,
    categoryIds
  })

  if (!filledMeme) {
    await releaseMemeDraft(memeId, MemeFillStatus.NONE)
    aiLogger.info(
      { memeId },
      'Meme draft fill ended: the Creator changed or deleted the Meme'
    )

    return
  }

  await safeAlgoliaOp(syncMemeToAllIndices(filledMeme))

  aiLogger.info({ memeId }, 'Meme draft filled')
}

async function releaseAfterFailure(memeId: string) {
  try {
    await releaseMemeDraft(memeId, MemeFillStatus.WAITING)
  } catch (error) {
    aiLogger.error({ error, memeId }, 'Failed to release the Meme draft')
  }
}

export async function fillMemeDraft(memeId: string) {
  try {
    const isClaimed = await claimMemeDraft(memeId)

    if (!isClaimed) {
      return
    }

    await withTimeout(
      () => {
        return runClaimedFill(memeId)
      },
      FILL_RUN_TIMEOUT_MS,
      `Meme draft fill ran out of time: ${memeId}`
    )
  } catch (error) {
    aiLogger.error({ error, memeId }, 'Meme draft fill gave up')
    captureWithFeature(error, 'meme-draft-fill')
    await releaseAfterFailure(memeId)
  }
}
