import { ENV } from '@/constants/env'
import type { MemeWithCategories, MemeWithVideo } from '@/constants/meme'
import { searchClient } from '@algolia/client-search'

const appID = 'W4S6H0K8DZ'
export const algoliaIndexName = ENV.ALGOLIA_INDEX

export const algoliaClient = searchClient(appID, ENV.ALGOLIA_SECRET)

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
    categorySlugs: meme.categories.map(({ category }) => {
      return category.slug
    }),
    createdAtTime: meme.createdAt.getTime(),
    publishedAtTime: meme.publishedAt?.getTime()
  }
}
