import { waitUntil } from '@vercel/functions'
import { PLAYABLE_BUNNY_STATUSES } from '~/constants/bunny'
import { DEFAULT_MEME_TITLE, MEME_ALGOLIA_INCLUDE } from '~/constants/meme'
import {
  MEME_FILL_MAX_ATTEMPTS,
  MEME_FILL_MAX_DURATION_MS
} from '~/constants/meme-fill'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import { MemeFillStatus, MemeStatus } from '~/db/generated/prisma/enums'
import {
  CONTENT_LOCALE_TO_LOCALE,
  REQUIRED_TRANSLATION_LOCALES,
  resolveCategoryTranslation
} from '~/helpers/i18n-content'
import { keepNewKeywords } from '~/helpers/keywords'
import { matchIsFillInFlight } from '~/helpers/meme-fill'
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
import { type Locale, locales } from '~/paraglide/runtime'

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

const DRAFT_CATEGORY_SELECT = {
  id: true,
  slug: true,
  title: true,
  keywords: true,
  translations: { select: { locale: true, title: true, keywords: true } }
} as const satisfies Prisma.CategorySelect

type DraftCategory = Prisma.CategoryGetPayload<{
  select: typeof DRAFT_CATEGORY_SELECT
}>

type KeepNewDraftKeywordsParams = {
  translations: DraftTranslations
  chosenCategories: DraftCategory[]
}

function keepNewDraftKeywords({
  translations,
  chosenCategories
}: KeepNewDraftKeywordsParams): DraftTranslations {
  return Object.fromEntries(
    locales.flatMap((locale) => {
      const translation = translations[locale]

      if (!translation) {
        return []
      }

      const categoryTexts = chosenCategories.flatMap((category) => {
        const { title, keywords } = resolveCategoryTranslation({
          translations: category.translations,
          requestedLocale: locale,
          fallback: category
        })

        return [title, ...keywords]
      })
      const keywords = keepNewKeywords({
        keywords: translation.keywords,
        knownTexts: [
          translation.title,
          translation.description,
          ...categoryTexts
        ]
      })

      return [[locale, { ...translation, keywords }]]
    })
  )
}

function resolveTranslation(translations: DraftTranslations, locale: Locale) {
  const translation = translations[locale]

  if (!translation) {
    throw new Error(`Missing the ${locale} record of the draft`)
  }

  return {
    title: translation.title,
    description: translation.description,
    keywords: translation.keywords
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

export const READY_MEME_DRAFT_WHERE = {
  status: MemeStatus.PENDING,
  fillStatus: MemeFillStatus.FILLED
} as const satisfies Prisma.MemeWhereInput

const UNFILLED_DRAFT_WHERE = {
  status: MemeStatus.PENDING,
  title: DEFAULT_MEME_TITLE
} as const satisfies Prisma.MemeWhereInput

const buildStaleRunWhere = (checkedAt: Date) => {
  return {
    fillStatus: MemeFillStatus.RUNNING,
    updatedAt: {
      lt: new Date(checkedAt.getTime() - MEME_FILL_MAX_DURATION_MS)
    }
  } satisfies Prisma.MemeWhereInput
}

type MatchIsFillStalledParams = {
  status: MemeFillStatus
  updatedAt: Date
  checkedAt: Date
}

export const matchIsFillStalled = ({
  status,
  updatedAt,
  checkedAt
}: MatchIsFillStalledParams) => {
  return (
    matchIsFillInFlight(status) &&
    checkedAt.getTime() - updatedAt.getTime() > MEME_FILL_MAX_DURATION_MS
  )
}

async function claimMemeFill(
  memeId: string,
  claimableFillStatus: Prisma.MemeWhereInput['fillStatus'],
  scope: Prisma.MemeWhereInput = {}
) {
  const claimedAt = new Date()
  const { count } = await prismaClient.meme.updateMany({
    where: {
      id: memeId,
      ...scope,
      OR: [{ fillStatus: claimableFillStatus }, buildStaleRunWhere(claimedAt)]
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
    throw new Error(`Bunny has no original for the finished video of ${memeId}`)
  }

  const categories = await prismaClient.category.findMany({
    select: DRAFT_CATEGORY_SELECT
  })
  const draft = await writeMemeDraft({
    video,
    customPrompt,
    targetLocale: MEME_DRAFT_LOCALE,
    categories,
    timeoutMs: FILL_VIDEO_TIMEOUT_MS
  })
  const chosenCategories = categories.filter(({ slug }) => {
    return draft.categorySlugs.includes(slug)
  })
  const translations = keepNewDraftKeywords({
    translations: await translateDraft(draft),
    chosenCategories
  })
  const categoryIds = chosenCategories.map(({ id }) => {
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

async function runClaimedFillWithinLimit(
  claimedFill: ClaimedFill,
  timeoutMs = FILL_RUN_TIMEOUT_MS
) {
  await withTimeout(
    () => {
      return runClaimedFill(claimedFill)
    },
    timeoutMs,
    `Meme draft fill ran out of time: ${claimedFill.memeId}`
  )
}

async function settleFill(memeId: string, run: () => Promise<void>) {
  try {
    await run()

    return null
  } catch (error) {
    aiLogger.error({ error, memeId }, 'Meme draft fill gave up')
    captureWithFeature(error, 'meme-draft-fill')
    await releaseAfterFailure(memeId)

    return error instanceof Error ? error.message : String(error)
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

export const buildNightQueueWhere = (checkedAt: Date) => {
  return {
    ...UNFILLED_DRAFT_WHERE,
    fillAttempts: { lt: MEME_FILL_MAX_ATTEMPTS },
    OR: [
      {
        fillStatus: MemeFillStatus.WAITING,
        video: { bunnyStatus: { in: [...PLAYABLE_BUNNY_STATUSES] } }
      },
      { fillStatus: MemeFillStatus.FAILED },
      buildStaleRunWhere(checkedAt)
    ]
  } satisfies Prisma.MemeWhereInput
}

export function findUnfilledMemeDrafts(checkedAt: Date) {
  return prismaClient.meme.findMany({
    where: {
      OR: [
        buildNightQueueWhere(checkedAt),
        {
          ...UNFILLED_DRAFT_WHERE,
          ...buildStaleRunWhere(checkedAt),
          fillAttempts: { gte: MEME_FILL_MAX_ATTEMPTS }
        }
      ]
    },
    select: { id: true, fillStatus: true, fillAttempts: true },
    orderBy: { createdAt: 'asc' }
  })
}

export type UnfilledMemeDraft = Awaited<
  ReturnType<typeof findUnfilledMemeDrafts>
>[number]

export type MemeFillFailure = {
  memeId: string
  attempts: number
  reason: string
}

async function abandonStaleMemeFill(memeId: string) {
  await prismaClient.meme.updateMany({
    where: {
      id: memeId,
      ...buildStaleRunWhere(new Date())
    },
    data: { fillStatus: MemeFillStatus.FAILED }
  })
}

async function retryMemeFill(memeId: string, timeoutMs: number) {
  return settleFill(memeId, async () => {
    const claimedAt = await claimMemeFill(
      memeId,
      { in: [MemeFillStatus.WAITING, MemeFillStatus.FAILED] },
      { ...UNFILLED_DRAFT_WHERE, fillAttempts: { lt: MEME_FILL_MAX_ATTEMPTS } }
    )

    if (claimedAt) {
      await runClaimedFillWithinLimit(
        { memeId, claimedAt, customPrompt: '' },
        Math.min(FILL_RUN_TIMEOUT_MS, timeoutMs)
      )
    }
  })
}

type RetryUnfilledMemeDraftParams = {
  draft: UnfilledMemeDraft
  timeoutMs: number
}

export async function retryUnfilledMemeDraft({
  draft,
  timeoutMs
}: RetryUnfilledMemeDraftParams): Promise<MemeFillFailure | null> {
  if (draft.fillStatus === MemeFillStatus.RUNNING) {
    const stopError = new Error(`Meme draft fill stopped mid-run: ${draft.id}`)
    captureWithFeature(stopError, 'meme-draft-fill')

    if (draft.fillAttempts >= MEME_FILL_MAX_ATTEMPTS) {
      await abandonStaleMemeFill(draft.id)

      return {
        memeId: draft.id,
        attempts: draft.fillAttempts,
        reason: stopError.message
      }
    }
  }

  const reason = await retryMemeFill(draft.id, timeoutMs)

  return reason === null
    ? null
    : { memeId: draft.id, attempts: draft.fillAttempts + 1, reason }
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
