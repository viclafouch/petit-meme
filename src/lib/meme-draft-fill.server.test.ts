import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { waitUntil } from '@vercel/functions'
import { HTTP_STATUS } from '~/constants/http'
import { DEFAULT_MEME_TITLE } from '~/constants/meme'
import { prismaClient } from '~/db/client.server'
import { Prisma } from '~/db/generated/prisma/client'
import {
  MemeContentLocale,
  MemeFillStatus,
  MemeStatus
} from '~/db/generated/prisma/enums'
import { syncMemeToAllIndices } from '~/lib/algolia.server'
import { fillMemeDraft, startMemeFill } from '~/lib/meme-draft-fill.server'
import type { MemeDraft } from '~/lib/meme-draft.server'
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

const MEME_ID = 'meme-id'
const BUNNY_ID = 'bunny-video-id'
const CREATED_AT = new Date('2026-11-09T00:00:00Z')
const CLAIMED_AT = new Date('2026-11-09T12:00:00Z')
const STALE_RUN_STARTED_BEFORE = new Date('2026-11-09T11:46:40Z')
const GEMINI_FILE_NAME = 'files/meme-video'
const GEMINI_FILE = {
  name: GEMINI_FILE_NAME,
  mimeType: 'video/mp4',
  state: 'ACTIVE',
  uri: `https://generativelanguage.googleapis.com/v1beta/${GEMINI_FILE_NAME}`
}
const GEMINI_UPLOAD_SESSION_URL =
  'https://generativelanguage.googleapis.com/upload/session/meme-video'

const PENDING_MEME = {
  id: MEME_ID,
  title: DEFAULT_MEME_TITLE,
  videoId: 1,
  viewCount: 0,
  shareCount: 0,
  downloadCount: 0,
  tweetUrl: null,
  description: '',
  keywords: [],
  contentLocale: MemeContentLocale.FR,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  publishedAt: null,
  status: MemeStatus.PENDING,
  video: { bunnyId: BUNNY_ID }
}

const buildCategory = (id: string, slug: string, title: string) => {
  return {
    id,
    slug,
    title,
    keywords: [],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  }
}

const CATEGORIES = [
  buildCategory('category-films', 'films', 'Films'),
  buildCategory('category-animals', 'animaux', 'Animaux')
]

const TRANSLATION_ROW = {
  id: 'translation-id',
  memeId: MEME_ID,
  locale: 'fr',
  title: DEFAULT_MEME_TITLE,
  description: '',
  keywords: [],
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT
}

const DRAFT: MemeDraft = {
  title: 'Tobey Maguire qui rigole - Spider-Man 3',
  source: 'Spider-Man 3',
  description: 'Découvrez et téléchargez ce mème de Tobey Maguire qui rigole.',
  keywords: ['tobey', 'maguire', 'rigoler', 'marrant', 'spiderman'],
  contentLocale: MemeContentLocale.FR,
  categorySlugs: ['films'],
  doubt: ''
}

const ENGLISH_TRANSLATION = {
  title: 'Tobey Maguire laughing - Spider-Man 3',
  description: 'Discover and download this meme of Tobey Maguire laughing.',
  keywords: ['Tobey', 'maguire', 'laugh', 'funny', 'spiderman']
}

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

const readFetchUrl = (input: string | URL | Request) => {
  return input instanceof Request ? input.url : String(input)
}

const matchIsGeneration = (url: string) => {
  return url.includes('GenerateContent') || url.includes(':generateContent')
}

const buildGeneration = (output: unknown) => {
  return {
    candidates: [
      {
        content: { role: 'model', parts: [{ text: JSON.stringify(output) }] },
        finishReason: 'STOP'
      }
    ]
  }
}

const respondToGeneration = (url: string, output: unknown) => {
  if (!url.includes(':streamGenerateContent')) {
    return Response.json(buildGeneration(output))
  }

  return new Response(`data: ${JSON.stringify(buildGeneration(output))}\n\n`, {
    headers: { 'content-type': 'text/event-stream' }
  })
}

type GeminiFakeParams = {
  originalStatus?: number
  generationStatuses?: number[]
  draft?: typeof DRAFT
}

const stubBunnyAndGemini = ({
  originalStatus = HTTP_STATUS.OK,
  generationStatuses = [],
  draft = DRAFT
}: GeminiFakeParams = {}) => {
  const pendingGenerationStatuses = [...generationStatuses]
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = readFetchUrl(input)
      const method =
        init?.method ?? (input instanceof Request ? input.method : 'GET')

      if (url.includes(`/${BUNNY_ID}/original`)) {
        return new Response(new Blob(['video'], { type: 'video/mp4' }), {
          status: originalStatus
        })
      }

      if (url.includes('/upload/v1beta/files')) {
        return new Response('{}', {
          headers: { 'x-goog-upload-url': GEMINI_UPLOAD_SESSION_URL }
        })
      }

      if (url.startsWith(GEMINI_UPLOAD_SESSION_URL)) {
        return Response.json(
          { file: GEMINI_FILE },
          { headers: { 'x-goog-upload-status': 'final' } }
        )
      }

      if (url.includes(`/${GEMINI_FILE_NAME}`)) {
        return Response.json(method === 'DELETE' ? {} : GEMINI_FILE)
      }

      if (matchIsGeneration(url) && url.includes('flash-lite')) {
        return respondToGeneration(url, { en: ENGLISH_TRANSLATION })
      }

      if (matchIsGeneration(url)) {
        const status = pendingGenerationStatuses.shift()

        if (status !== undefined) {
          return Response.json(
            { error: { code: status, message: 'high demand' } },
            { status }
          )
        }

        return respondToGeneration(url, draft)
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`)
    }
  )
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

const readDraftPrompts = (fetchMock: ReturnType<typeof stubBunnyAndGemini>) => {
  return fetchMock.mock.calls
    .filter(([input]) => {
      const url = readFetchUrl(input)

      return matchIsGeneration(url) && !url.includes('flash-lite')
    })
    .map(([, init]) => {
      return typeof init?.body === 'string' ? init.body : ''
    })
}

const settleBackgroundRun = async () => {
  const [run] = vi.mocked(waitUntil).mock.calls.at(-1) ?? []

  await run
}

const countGenerationCalls = (
  fetchMock: ReturnType<typeof stubBunnyAndGemini>
) => {
  return fetchMock.mock.calls.filter(([input]) => {
    return matchIsGeneration(readFetchUrl(input))
  }).length
}

type DatabaseStubParams = {
  claimedCount?: number
  writtenCount?: number
}

const stubDatabase = ({
  claimedCount = 1,
  writtenCount = 1
}: DatabaseStubParams = {}) => {
  vi.spyOn(prismaClient, '$transaction').mockImplementation(async (run) => {
    return typeof run === 'function'
      ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Prisma types the transaction client without the global omit of the client it runs on
        run(prismaClient as never)
      : []
  })
  vi.spyOn(prismaClient.meme, 'findUnique').mockResolvedValue(PENDING_MEME)
  vi.spyOn(prismaClient.category, 'findMany').mockResolvedValue(CATEGORIES)

  return {
    updateFillStatus: vi
      .spyOn(prismaClient.meme, 'updateMany')
      .mockResolvedValueOnce({ count: claimedCount })
      .mockResolvedValueOnce({ count: writtenCount })
      .mockResolvedValue({ count: 1 }),
    deleteTranslations: vi
      .spyOn(prismaClient.memeTranslation, 'deleteMany')
      .mockResolvedValue({ count: 0 }),
    upsertTranslation: vi
      .spyOn(prismaClient.memeTranslation, 'upsert')
      .mockResolvedValue(TRANSLATION_ROW),
    linkCategories: vi
      .spyOn(prismaClient.memeCategory, 'createMany')
      .mockResolvedValue({ count: 1 }),
    readFilledMeme: vi
      .spyOn(prismaClient.meme, 'findUniqueOrThrow')
      .mockResolvedValue(PENDING_MEME)
  }
}

describe('fillMemeDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: CLAIMED_AT })
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key')
    vi.stubEnv('VITE_BUNNY_HOSTNAME', 'cdn-test.petit-meme.io')
    vi.stubEnv('BUNNY_TOKEN_AUTH_KEY', 'token-auth-key-of-at-least-32-chars')
    vi.stubEnv('BUNNY_ORIGINAL_ACCESS_KEY', 'original-access-key')
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
        keywords: ['tobey', 'maguire', 'laugh', 'funny', 'spiderman']
      },
      create: {
        memeId: MEME_ID,
        locale: 'en',
        title: ENGLISH_TRANSLATION.title,
        description: ENGLISH_TRANSLATION.description,
        keywords: ['tobey', 'maguire', 'laugh', 'funny', 'spiderman']
      }
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
