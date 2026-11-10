import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { BUNNY_STATUS } from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { DEFAULT_MEME_TITLE } from '~/constants/meme'
import { prismaClient } from '~/db/client.server'
import { MemeFillStatus, MemeStatus } from '~/db/generated/prisma/enums'
import { syncMemeToAllIndices } from '~/lib/algolia.server'
import {
  DRAFT,
  stubBunnyAndGemini,
  stubDatabase,
  stubFillEnv
} from '~/lib/meme-draft-fill.fakes'
import { sendEmail } from '~/lib/resend.server'
import { captureWithFeature } from '~/lib/sentry'

vi.mock(import('~/lib/algolia.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    syncMemeToAllIndices: vi.fn<typeof syncMemeToAllIndices>()
  }
})

vi.mock(import('~/lib/sentry'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    captureWithFeature: vi.fn<typeof captureWithFeature>()
  }
})

vi.mock(import('~/lib/resend.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    sendEmail: vi.fn<typeof sendEmail>().mockResolvedValue(true)
  }
})

const STARTED_AT = new Date('2026-11-11T03:02:00Z')
const STALE_RUN_STARTED_BEFORE = new Date('2026-11-11T02:48:40Z')

type QueuedMeme = {
  id: string
  fillStatus: MemeFillStatus
  fillAttempts: number
}

type ReadyDraft = {
  id: string
  title: string
  fillDoubt: string
}

type NightStubParams = {
  queue: QueuedMeme[]
  readyDrafts: ReadyDraft[]
}

const stubNight = ({ queue, readyDrafts }: NightStubParams) => {
  const database = stubDatabase()
  const findMemes = vi
    .spyOn(prismaClient.meme, 'findMany')
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the spy returns the selected fields, Prisma types it as the full Meme
    .mockResolvedValueOnce(queue as never)
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the spy returns the selected fields, Prisma types it as the full Meme
    .mockResolvedValueOnce(readyDrafts as never)

  return { ...database, findMemes }
}

const readUpdatedMemeIds = (
  updateFillStatus: ReturnType<typeof stubNight>['updateFillStatus']
) => {
  return updateFillStatus.mock.calls.map(([args]) => {
    return args.where?.id
  })
}

let runMemeFillNight: typeof import('~/server/meme-fill-night.server').runMemeFillNight

describe('runMemeFillNight', () => {
  beforeAll(async () => {
    vi.resetModules()
    ;({ runMemeFillNight } = await import('~/server/meme-fill-night.server'))
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: STARTED_AT })
    stubFillEnv()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('should fill the unfilled drafts one after the other, then email the drafts ready to review', async () => {
    stubBunnyAndGemini()
    const { findMemes, updateFillStatus } = stubNight({
      queue: [
        { id: 'meme-a', fillStatus: MemeFillStatus.WAITING, fillAttempts: 0 },
        { id: 'meme-b', fillStatus: MemeFillStatus.FAILED, fillAttempts: 1 }
      ],
      readyDrafts: [{ id: 'meme-a', title: DRAFT.title, fillDoubt: 'Source ?' }]
    })

    const night = await runMemeFillNight(STARTED_AT)

    expect(findMemes).toHaveBeenNthCalledWith(1, {
      where: {
        status: MemeStatus.PENDING,
        title: DEFAULT_MEME_TITLE,
        OR: [
          {
            fillStatus: MemeFillStatus.WAITING,
            video: {
              bunnyStatus: {
                in: [BUNNY_STATUS.FINISHED, BUNNY_STATUS.RESOLUTION_FINISHED]
              }
            }
          },
          { fillStatus: MemeFillStatus.FAILED, fillAttempts: { lt: 3 } },
          {
            fillStatus: MemeFillStatus.RUNNING,
            updatedAt: { lt: STALE_RUN_STARTED_BEFORE }
          }
        ]
      },
      select: { id: true, fillStatus: true, fillAttempts: true },
      orderBy: { createdAt: 'asc' }
    })
    expect(readUpdatedMemeIds(updateFillStatus)).toStrictEqual([
      'meme-a',
      'meme-a',
      'meme-b',
      'meme-b'
    ])
    expect(syncMemeToAllIndices).toHaveBeenCalledTimes(2)
    expect(night).toStrictEqual({
      isSent: true,
      digest: {
        readyDrafts: [{ id: 'meme-a', title: DRAFT.title, doubt: 'Source ?' }],
        failures: []
      }
    })
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        idempotencyKey: 'meme-fill-digest/2026-11-11T00:00:00.000Z'
      })
    )
  })

  it('should list a failed retry with its reason and its attempt count, and report it once', async () => {
    stubBunnyAndGemini({ originalStatus: HTTP_STATUS.NOT_FOUND })
    stubNight({
      queue: [
        { id: 'meme-a', fillStatus: MemeFillStatus.FAILED, fillAttempts: 2 }
      ],
      readyDrafts: []
    })

    const night = await runMemeFillNight(STARTED_AT)

    expect(night).toStrictEqual({
      isSent: true,
      digest: {
        readyDrafts: [],
        failures: [
          {
            memeId: 'meme-a',
            attempts: 3,
            reason: 'Bunny has no original for the finished video of meme-a'
          }
        ]
      }
    })
    expect(captureWithFeature).toHaveBeenCalledTimes(1)
  })

  it('should send no email when the digest has nothing to list', async () => {
    stubBunnyAndGemini()
    stubNight({ queue: [], readyDrafts: [] })

    const night = await runMemeFillNight(STARTED_AT)

    expect(night).toStrictEqual({
      isSent: false,
      digest: { readyDrafts: [], failures: [] }
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('should leave the rest of the queue to the next night once the function runs out of time', async () => {
    stubBunnyAndGemini({
      onDraftGeneration: () => {
        vi.setSystemTime(new Date('2026-11-11T03:12:00Z'))
      }
    })
    const { updateFillStatus } = stubNight({
      queue: [
        { id: 'meme-a', fillStatus: MemeFillStatus.WAITING, fillAttempts: 0 },
        { id: 'meme-b', fillStatus: MemeFillStatus.WAITING, fillAttempts: 0 }
      ],
      readyDrafts: [{ id: 'meme-a', title: DRAFT.title, fillDoubt: '' }]
    })

    const night = await runMemeFillNight(STARTED_AT)

    expect(readUpdatedMemeIds(updateFillStatus)).toStrictEqual([
      'meme-a',
      'meme-a'
    ])
    expect(night.isSent).toBe(true)
  })

  it('should report a run killed mid-run once, then retry it like a failed run', async () => {
    stubBunnyAndGemini()
    const { updateFillStatus } = stubNight({
      queue: [
        { id: 'meme-a', fillStatus: MemeFillStatus.RUNNING, fillAttempts: 1 }
      ],
      readyDrafts: [{ id: 'meme-a', title: DRAFT.title, fillDoubt: '' }]
    })

    const night = await runMemeFillNight(STARTED_AT)

    expect(captureWithFeature).toHaveBeenCalledExactlyOnceWith(
      new Error('Meme draft fill stopped mid-run: meme-a'),
      'meme-draft-fill'
    )
    expect(readUpdatedMemeIds(updateFillStatus)).toStrictEqual([
      'meme-a',
      'meme-a'
    ])
    expect(night.digest.failures).toStrictEqual([])
  })

  it('should give up on a run killed mid-run at the last attempt, and list it without retrying it', async () => {
    const fetchMock = stubBunnyAndGemini()
    const { updateFillStatus } = stubNight({
      queue: [
        { id: 'meme-a', fillStatus: MemeFillStatus.RUNNING, fillAttempts: 3 }
      ],
      readyDrafts: []
    })

    const night = await runMemeFillNight(STARTED_AT)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(updateFillStatus).toHaveBeenCalledExactlyOnceWith({
      where: {
        id: 'meme-a',
        fillStatus: MemeFillStatus.RUNNING,
        updatedAt: { lt: STALE_RUN_STARTED_BEFORE }
      },
      data: { fillStatus: MemeFillStatus.FAILED }
    })
    expect(captureWithFeature).toHaveBeenCalledTimes(1)
    expect(night.digest.failures).toStrictEqual([
      {
        memeId: 'meme-a',
        attempts: 3,
        reason: 'Meme draft fill stopped mid-run: meme-a'
      }
    ])
  })
})
