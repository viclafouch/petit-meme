import { waitUntil } from '@vercel/functions'
import { DEFAULT_MEME_TITLE, MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import { MEME_FILL_MAX_DURATION_MS } from '~/constants/meme-fill'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
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
  claimedAt: Date
  draft: MemeDraft
  translations: DraftTranslations
  categoryIds: string[]
}

async function writeFilledDraft({
  memeId,
  claimedAt,
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
        fillStatus: MemeFillStatus.RUNNING,
        updatedAt: claimedAt
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

type StoreSuggestionParams = {
  memeId: string
  draft: MemeDraft
  translations: DraftTranslations
}

async function storeSuggestion({
  memeId,
  draft,
  translations
}: StoreSuggestionParams) {
  const fillSuggestion = Object.fromEntries(
    REQUIRED_TRANSLATION_LOCALES[draft.contentLocale].map((locale) => {
      return [locale, resolveTranslation(translations, locale)]
    })
  )
  const { count } = await prismaClient.meme.updateMany({
    where: { id: memeId, fillStatus: MemeFillStatus.RUNNING },
    data: {
      fillStatus: MemeFillStatus.FILLED,
      fillDoubt: draft.doubt,
      fillSuggestion
    }
  })

  return count === 1
}

async function claimMemeFill(
  memeId: string,
  claimableFillStatus: Prisma.MemeWhereInput['fillStatus']
) {
  const claimedAt = new Date()
  const { count } = await prismaClient.meme.updateMany({
    where: {
      id: memeId,
      OR: [
        { fillStatus: claimableFillStatus },
        {
          fillStatus: MemeFillStatus.RUNNING,
          updatedAt: {
            lt: new Date(claimedAt.getTime() - MEME_FILL_MAX_DURATION_MS)
          }
        }
      ]
    },
    data: {
      fillStatus: MemeFillStatus.RUNNING,
      fillAttempts: { increment: 1 },
      fillSuggestion: Prisma.DbNull,
      updatedAt: claimedAt
    }
  })

  return count === 1 ? claimedAt : null
}

async function releaseMemeDraft(memeId: string, fillStatus: MemeFillStatus) {
  await prismaClient.meme.updateMany({
    where: { id: memeId, fillStatus: MemeFillStatus.RUNNING },
    data: { fillStatus }
  })
}

type ClaimedFill = {
  memeId: string
  claimedAt: Date
  customPrompt: string
}

async function runClaimedFill({
  memeId,
  claimedAt,
  customPrompt
}: ClaimedFill) {
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
    await releaseMemeDraft(memeId, MemeFillStatus.FAILED)
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
    customPrompt,
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
    claimedAt,
    draft,
    translations,
    categoryIds
  })

  if (!filledMeme) {
    const isSuggested = await storeSuggestion({ memeId, draft, translations })

    aiLogger.info(
      { memeId },
      isSuggested
        ? 'Meme fill kept as a suggestion: the Creator changed the Meme'
        : 'Meme fill ended: the Meme is gone'
    )

    return
  }

  await safeAlgoliaOp(syncMemeToAllIndices(filledMeme))

  aiLogger.info({ memeId }, 'Meme draft filled')
}

async function releaseAfterFailure(memeId: string) {
  try {
    await releaseMemeDraft(memeId, MemeFillStatus.FAILED)
  } catch (error) {
    aiLogger.error({ error, memeId }, 'Failed to release the Meme draft')
  }
}

async function runClaimedFillWithinLimit(claimedFill: ClaimedFill) {
  await withTimeout(
    () => {
      return runClaimedFill(claimedFill)
    },
    FILL_RUN_TIMEOUT_MS,
    `Meme draft fill ran out of time: ${claimedFill.memeId}`
  )
}

async function settleFill(memeId: string, run: () => Promise<void>) {
  try {
    await run()
  } catch (error) {
    aiLogger.error({ error, memeId }, 'Meme draft fill gave up')
    captureWithFeature(error, 'meme-draft-fill')
    await releaseAfterFailure(memeId)
  }
}

export async function fillMemeDraft(memeId: string) {
  await settleFill(memeId, async () => {
    const claimedAt = await claimMemeFill(memeId, MemeFillStatus.WAITING)

    if (claimedAt) {
      await runClaimedFillWithinLimit({ memeId, claimedAt, customPrompt: '' })
    }
  })
}

type StartMemeFillParams = {
  memeId: string
  customPrompt: string
}

export async function startMemeFill({
  memeId,
  customPrompt
}: StartMemeFillParams) {
  const claimedAt = await claimMemeFill(memeId, {
    not: MemeFillStatus.RUNNING
  })

  if (!claimedAt) {
    return false
  }

  waitUntil(
    settleFill(memeId, () => {
      return runClaimedFillWithinLimit({ memeId, claimedAt, customPrompt })
    })
  )

  return true
}
