import { vi } from 'vitest'
import { HTTP_STATUS } from '~/constants/http'
import { DEFAULT_MEME_TITLE } from '~/constants/meme'
import { prismaClient } from '~/db/client.server'
import { MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import type { MemeDraft } from '~/lib/meme-draft.server'

export const MEME_ID = 'meme-id'
const BUNNY_ID = 'bunny-video-id'
const CREATED_AT = new Date('2026-11-09T00:00:00Z')
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

export const DRAFT: MemeDraft = {
  title: 'Tobey Maguire qui rigole - Spider-Man 3',
  source: 'Spider-Man 3',
  description: 'Découvrez et téléchargez ce mème de Tobey Maguire qui rigole.',
  keywords: ['tobey', 'maguire', 'rigoler', 'marrant', 'spiderman'],
  contentLocale: MemeContentLocale.FR,
  categorySlugs: ['films'],
  doubt: ''
}

export const ENGLISH_TRANSLATION = {
  title: 'Tobey Maguire laughing - Spider-Man 3',
  description: 'Discover and download this meme of Tobey Maguire laughing.',
  keywords: ['Tobey', 'maguire', 'laugh', 'funny', 'spiderman']
}

const readFetchUrl = (input: string | URL | Request) => {
  return input instanceof Request ? input.url : String(input)
}

const matchIsGeneration = (url: string) => {
  return url.includes('GenerateContent') || url.includes(':generateContent')
}

const matchIsDraftGeneration = (url: string) => {
  return matchIsGeneration(url) && !url.includes('flash-lite')
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
  onDraftGeneration?: () => void
}

export const stubBunnyAndGemini = ({
  originalStatus = HTTP_STATUS.OK,
  generationStatuses = [],
  draft = DRAFT,
  onDraftGeneration
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

      if (matchIsDraftGeneration(url)) {
        onDraftGeneration?.()
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

type FetchMock = ReturnType<typeof stubBunnyAndGemini>

export const readDraftPrompts = (fetchMock: FetchMock) => {
  return fetchMock.mock.calls
    .filter(([input]) => {
      return matchIsDraftGeneration(readFetchUrl(input))
    })
    .map(([, init]) => {
      return typeof init?.body === 'string' ? init.body : ''
    })
}

export const countGenerationCalls = (fetchMock: FetchMock) => {
  return fetchMock.mock.calls.filter(([input]) => {
    return matchIsGeneration(readFetchUrl(input))
  }).length
}

export const stubFillEnv = () => {
  vi.stubEnv('GEMINI_API_KEY', 'gemini-key')
  vi.stubEnv('VITE_BUNNY_HOSTNAME', 'cdn-test.petit-meme.io')
  vi.stubEnv('BUNNY_TOKEN_AUTH_KEY', 'token-auth-key-of-at-least-32-chars')
  vi.stubEnv('BUNNY_ORIGINAL_ACCESS_KEY', 'original-access-key')
}

type DatabaseStubParams = {
  claimedCount?: number
  writtenCount?: number
}

export const stubDatabase = ({
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
