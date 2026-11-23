import type { MemeWithVideo } from '~/constants/meme'
import type { CategoryFamily } from '~/db/generated/prisma/enums'
import type { LibraryCategory } from '~/routes/_public__root/memes/-lib/library'

const CREATED_AT = new Date('2026-11-01T00:00:00Z')

type FakeCategoryParams = {
  slug: string
  family: CategoryFamily | null
  memeCount: number
}

export const buildFakeCategory = ({
  slug,
  family,
  memeCount
}: FakeCategoryParams) => {
  return {
    id: `category-${slug}`,
    slug,
    title: slug,
    keywords: [],
    family,
    emoji: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    translations: [],
    _count: { memes: memeCount },
    memeCount
  } satisfies LibraryCategory
}

export const buildFakeMeme = (id: string, title = id) => {
  return {
    id,
    title,
    videoId: 1,
    viewCount: 0,
    shareCount: 0,
    downloadCount: 0,
    tweetUrl: null,
    description: '',
    keywords: [],
    contentLocale: 'FR',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    publishedAt: CREATED_AT,
    status: 'PUBLISHED',
    video: {
      id: 1,
      bunnyId: `bunny-${id}`,
      duration: 6,
      width: 1920,
      height: 1080,
      bunnyStatus: 3
    }
  } satisfies MemeWithVideo
}
