import type { MemeWithCategories, MemeWithVideo } from '@/constants/meme'
import { serverEnv } from '@/env/server'
import { buildVideoImageUrl } from '@/lib/bunny'
import { searchClient } from '@algolia/client-search'

export const algoliaIndexName = serverEnv.ALGOLIA_INDEX

export const algoliaClient = searchClient(
  serverEnv.ALGOLIA_APP_ID,
  serverEnv.ALGOLIA_SECRET
)

export async function safeAlgoliaOp<T>(promise: Promise<T>) {
  try {
    return await promise
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)

    return null
  }
}

export function memeToAlgoliaRecord(meme: MemeWithVideo & MemeWithCategories) {
  return {
    ...meme,
    objectID: meme.id,
    categoryTitles: meme.categories.map(({ category }) => {
      return category.title
    }),
    categoryKeywords: meme.categories.map(({ category }) => {
      return category.keywords
    }),
    imageURL: buildVideoImageUrl(meme.video.bunnyId),
    categorySlugs: meme.categories.map(({ category }) => {
      return category.slug
    }),
    createdAtTime: meme.createdAt.getTime(),
    publishedAtTime: meme.publishedAt?.getTime()
  }
}
