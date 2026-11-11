import { afterEach, describe, expect, it, vi } from 'vitest'
import { prismaClient } from '~/db/client.server'
import { MemeContentLocale, MemeStatus } from '~/db/generated/prisma/enums'
import { syncMemeToAllIndices } from '~/lib/algolia.server'
import { logAuditAction } from '~/server/audit.server'
import { editMemeRecord } from '~/server/meme-edit.server'

vi.mock(import('~/lib/algolia.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    syncMemeToAllIndices: vi.fn<typeof syncMemeToAllIndices>()
  }
})

vi.mock(import('~/server/audit.server'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    logAuditAction: vi.fn<typeof logAuditAction>()
  }
})

const MEME_ID = 'meme-id'
const ADMIN_ID = 'admin-id'
const CREATED_AT = new Date('2026-11-09T00:00:00Z')

const DRAFT_RECORD = {
  title: 'Tobey Maguire se moque',
  description: 'Peter Parker rigole',
  keywords: ['rigoler']
}

const SAVED_MEME = {
  id: MEME_ID,
  title: DRAFT_RECORD.title,
  videoId: 1,
  viewCount: 0,
  shareCount: 0,
  downloadCount: 0,
  tweetUrl: null,
  description: DRAFT_RECORD.description,
  keywords: DRAFT_RECORD.keywords,
  contentLocale: MemeContentLocale.FR,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  publishedAt: null,
  status: MemeStatus.PENDING,
  video: { bunnyId: 'bunny-video-id' },
  categories: [],
  translations: []
}

describe('editMemeRecord', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('should mark the record as the Creator’s when the Creator saves a pending draft', async () => {
    vi.spyOn(prismaClient.meme, 'findUnique').mockResolvedValue(SAVED_MEME)
    const updateMeme = vi
      .spyOn(prismaClient.meme, 'update')
      .mockResolvedValue(SAVED_MEME)

    await editMemeRecord({
      values: {
        id: MEME_ID,
        contentLocale: MemeContentLocale.FR,
        translations: {
          fr: DRAFT_RECORD,
          en: { title: '', description: '', keywords: [] }
        },
        categoryIds: [],
        tweetUrl: null
      },
      adminId: ADMIN_ID
    })

    expect(updateMeme).toHaveBeenCalledTimes(1)
    expect(updateMeme.mock.lastCall?.[0].data).toHaveProperty(
      'fillWrittenAt',
      null
    )
  })
})
