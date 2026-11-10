import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { waitUntil } from '@vercel/functions'
import { HTTP_STATUS } from '~/constants/http'
import { DEFAULT_MEME_TITLE } from '~/constants/meme'
import { Prisma } from '~/db/generated/prisma/client'
import {
  MemeContentLocale,
  MemeFillStatus,
  MemeStatus
} from '~/db/generated/prisma/enums'
import { syncMemeToAllIndices } from '~/lib/algolia.server'
import {
  countGenerationCalls,
  DRAFT,
  ENGLISH_TRANSLATION,
  MEME_ID,
  readDraftPrompts,
  stubBunnyAndGemini,
  stubDatabase,
  stubFillEnv
} from '~/lib/meme-draft-fill.fakes'
import { fillMemeDraft, startMemeFill } from '~/lib/meme-draft-fill.server'
import { captureWithFeature } from '~/lib/sentry'

vi.mock(import('~/lib/algolia.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    syncMemeToAllIndices: vi.fn<typeof syncMemeToAllIndices>()
  }
})

vi.mock(import('@vercel/functions'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    waitUntil: vi.fn<typeof waitUntil>()
  }
})

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

const CLAIMED_AT = new Date('2026-11-09T12:00:00Z')
const STALE_RUN_STARTED_BEFORE = new Date('2026-11-09T11:46:40Z')

const buildRelease = (fillStatus: MemeFillStatus) => {
  return {
    where: { id: MEME_ID, fillStatus: MemeFillStatus.RUNNING },
    data: { fillStatus }
  }
}

const GUARDED_WRITE_WHERE = {
  id: MEME_ID,
  status: MemeStatus.PENDING,
  title: DEFAULT_MEME_TITLE,
  fillStatus: MemeFillStatus.RUNNING,
  updatedAt: CLAIMED_AT
}

const SUGGESTION_WRITE = {
  where: { id: MEME_ID, fillStatus: MemeFillStatus.RUNNING },
  data: {
    fillStatus: MemeFillStatus.FILLED,
    fillDoubt: '',
    fillSuggestion: {
      fr: {
        title: DRAFT.title,
        description: DRAFT.description,
        keywords: DRAFT.keywords
      }
    }
  }
}

const settleBackgroundRun = async () => {
  const [run] = vi.mocked(waitUntil).mock.calls.at(-1) ?? []

  await run
}

describe('fillMemeDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: CLAIMED_AT })
    stubFillEnv()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('should write the Gemini record into a waiting draft, only while nobody saved the pending draft since the claim', async () => {
    stubBunnyAndGemini()
    const { updateFillStatus, upsertTranslation, linkCategories } =
      stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(updateFillStatus).toHaveBeenNthCalledWith(2, {
      where: GUARDED_WRITE_WHERE,
      data: {
        title: DRAFT.title,
        description: DRAFT.description,
        keywords: DRAFT.keywords,
        contentLocale: MemeContentLocale.FR,
        fillStatus: MemeFillStatus.FILLED,
        fillDoubt: ''
      }
    })
    expect(upsertTranslation).toHaveBeenCalledTimes(1)
    expect(linkCategories).toHaveBeenCalledExactlyOnceWith({
      data: [{ memeId: MEME_ID, categoryId: 'category-films' }],
      skipDuplicates: true
    })
    expect(syncMemeToAllIndices).toHaveBeenCalledTimes(1)
    expect(captureWithFeature).not.toHaveBeenCalled()
  })

  it('should keep only the keywords that add a word absent from the title, the description and the chosen Categories', async () => {
    stubBunnyAndGemini({
      draft: {
        ...DRAFT,
        keywords: ['rigoler', 'tobey', 'téléchargez', 'cinema', 'chat']
      }
    })
    const { updateFillStatus } = stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(updateFillStatus).toHaveBeenNthCalledWith(2, {
      where: GUARDED_WRITE_WHERE,
      data: {
        title: DRAFT.title,
        description: DRAFT.description,
        keywords: ['rigoler', 'chat'],
        contentLocale: MemeContentLocale.FR,
        fillStatus: MemeFillStatus.FILLED,
        fillDoubt: ''
      }
    })
  })

  it('should show Gemini the keywords of each Category, so the draft keywords can avoid them', async () => {
    const fetchMock = stubBunnyAndGemini()
    stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(readDraftPrompts(fetchMock)).toStrictEqual([
      expect.stringContaining('cinéma')
    ])
  })

  it('should let Gemini pick only the slugs of existing Categories', async () => {
    const fetchMock = stubBunnyAndGemini()
    stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(readDraftPrompts(fetchMock)).toStrictEqual([
      expect.stringContaining('"enum":["films","animaux"]')
    ])
  })

  it('should claim a waiting draft, or a run left running past the function limit, and count the attempt', async () => {
    stubBunnyAndGemini()
    const { updateFillStatus } = stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(updateFillStatus).toHaveBeenNthCalledWith(1, {
      where: {
        id: MEME_ID,
        OR: [
          { fillStatus: MemeFillStatus.WAITING },
          {
            fillStatus: MemeFillStatus.RUNNING,
            updatedAt: { lt: STALE_RUN_STARTED_BEFORE }
          }
        ]
      },
      data: {
        fillStatus: MemeFillStatus.RUNNING,
        fillAttempts: { increment: 1 },
        fillSuggestion: Prisma.DbNull,
        updatedAt: CLAIMED_AT
      }
    })
  })

  it('should retry Gemini after a 503 and still fill the draft', async () => {
    const fetchMock = stubBunnyAndGemini({
      generationStatuses: [HTTP_STATUS.SERVICE_UNAVAILABLE]
    })
    const { readFilledMeme } = stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(countGenerationCalls(fetchMock)).toBe(2)
    expect(readFilledMeme).toHaveBeenCalledTimes(1)
    expect(captureWithFeature).not.toHaveBeenCalled()
  })

  it('should start nothing for a Meme deleted or already claimed', async () => {
    const fetchMock = stubBunnyAndGemini()
    const { updateFillStatus } = stubDatabase({ claimedCount: 0 })

    await fillMemeDraft(MEME_ID)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(updateFillStatus).toHaveBeenCalledTimes(1)
  })

  it('should keep the record as a suggestion, without touching the Meme, when the Creator saved it during the run', async () => {
    stubBunnyAndGemini()
    const { updateFillStatus, upsertTranslation, linkCategories } =
      stubDatabase({ writtenCount: 0 })

    await fillMemeDraft(MEME_ID)

    expect(upsertTranslation).not.toHaveBeenCalled()
    expect(linkCategories).not.toHaveBeenCalled()
    expect(syncMemeToAllIndices).not.toHaveBeenCalled()
    expect(captureWithFeature).not.toHaveBeenCalled()
    expect(updateFillStatus).toHaveBeenLastCalledWith(SUGGESTION_WRITE)
  })

  it('should mark the draft failed, and report once, when Gemini rejects the run', async () => {
    stubBunnyAndGemini({ generationStatuses: [HTTP_STATUS.BAD_REQUEST] })
    const { updateFillStatus, readFilledMeme } = stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(readFilledMeme).not.toHaveBeenCalled()
    expect(updateFillStatus).toHaveBeenLastCalledWith(
      buildRelease(MemeFillStatus.FAILED)
    )
    expect(captureWithFeature).toHaveBeenCalledExactlyOnceWith(
      expect.any(Error),
      'meme-draft-fill'
    )
  })

  it('should mark the draft failed without calling Gemini, and report once, when Bunny has no original', async () => {
    const fetchMock = stubBunnyAndGemini({
      originalStatus: HTTP_STATUS.NOT_FOUND
    })
    const { updateFillStatus, readFilledMeme } = stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(readFilledMeme).not.toHaveBeenCalled()
    expect(updateFillStatus).toHaveBeenLastCalledWith(
      buildRelease(MemeFillStatus.FAILED)
    )
    expect(captureWithFeature).toHaveBeenCalledTimes(1)
  })

  it('should settle and report once when the database fails', async () => {
    stubBunnyAndGemini()
    const { updateFillStatus } = stubDatabase()
    updateFillStatus
      .mockReset()
      .mockRejectedValue(new Error('Connection reset'))

    await expect(fillMemeDraft(MEME_ID)).resolves.toBeUndefined()
    expect(captureWithFeature).toHaveBeenCalledTimes(1)
  })

  it('should store the French record and its English translation for a universal Meme', async () => {
    stubBunnyAndGemini({
      draft: { ...DRAFT, contentLocale: MemeContentLocale.UNIVERSAL }
    })
    const { deleteTranslations, upsertTranslation } = stubDatabase()

    await fillMemeDraft(MEME_ID)

    expect(deleteTranslations).toHaveBeenCalledExactlyOnceWith({
      where: { memeId: MEME_ID, locale: { notIn: ['fr', 'en'] } }
    })
    expect(upsertTranslation).toHaveBeenCalledTimes(2)
    expect(upsertTranslation).toHaveBeenLastCalledWith({
      where: { memeId_locale: { memeId: MEME_ID, locale: 'en' } },
      update: {
        title: ENGLISH_TRANSLATION.title,
        description: ENGLISH_TRANSLATION.description,
        keywords: ['laugh', 'funny', 'bully', 'peter', 'parker']
      },
      create: {
        memeId: MEME_ID,
        locale: 'en',
        title: ENGLISH_TRANSLATION.title,
        description: ENGLISH_TRANSLATION.description,
        keywords: ['laugh', 'funny', 'bully', 'peter', 'parker']
      }
    })
  })

  it('should keep only the English keywords that add a word absent from the English title, description and chosen Categories', async () => {
    stubBunnyAndGemini({
      draft: { ...DRAFT, contentLocale: MemeContentLocale.UNIVERSAL },
      englishTranslation: {
        ...ENGLISH_TRANSLATION,
        keywords: ['laugh', 'Tobey', 'download', 'movies', 'cinema', 'cat']
      }
    })
    const { upsertTranslation } = stubDatabase()

    await fillMemeDraft(MEME_ID)

    const englishRecord = {
      title: ENGLISH_TRANSLATION.title,
      description: ENGLISH_TRANSLATION.description,
      keywords: ['laugh', 'cat']
    }

    expect(upsertTranslation).toHaveBeenLastCalledWith({
      where: { memeId_locale: { memeId: MEME_ID, locale: 'en' } },
      update: englishRecord,
      create: { memeId: MEME_ID, locale: 'en', ...englishRecord }
    })
  })

  it('should start AI Assist on a Meme that is not running, and write the record with the context of the Creator', async () => {
    const fetchMock = stubBunnyAndGemini()
    const { updateFillStatus } = stubDatabase({ writtenCount: 0 })

    await expect(
      startMemeFill({ memeId: MEME_ID, customPrompt: 'Le chat de Shrek' })
    ).resolves.toBe(true)
    await settleBackgroundRun()

    expect(updateFillStatus).toHaveBeenNthCalledWith(1, {
      where: {
        id: MEME_ID,
        OR: [
          { fillStatus: { not: MemeFillStatus.RUNNING } },
          {
            fillStatus: MemeFillStatus.RUNNING,
            updatedAt: { lt: STALE_RUN_STARTED_BEFORE }
          }
        ]
      },
      data: {
        fillStatus: MemeFillStatus.RUNNING,
        fillAttempts: { increment: 1 },
        fillSuggestion: Prisma.DbNull,
        updatedAt: CLAIMED_AT
      }
    })
    expect(readDraftPrompts(fetchMock)).toStrictEqual([
      expect.stringContaining('Le chat de Shrek')
    ])
    expect(updateFillStatus).toHaveBeenLastCalledWith(SUGGESTION_WRITE)
  })

  it('should refuse AI Assist while a run is in flight', async () => {
    const fetchMock = stubBunnyAndGemini()
    stubDatabase({ claimedCount: 0 })

    await expect(
      startMemeFill({ memeId: MEME_ID, customPrompt: '' })
    ).resolves.toBe(false)

    expect(waitUntil).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
