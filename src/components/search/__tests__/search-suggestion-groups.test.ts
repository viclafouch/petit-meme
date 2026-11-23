import { describe, expect, it } from 'vitest'
import { buildSearchSuggestionGroups } from '~/components/search/search-suggestion-groups'
import { CategoryFamily } from '~/db/generated/prisma/enums'
import {
  buildFakeCategory,
  buildFakeMeme
} from '~/routes/_public__root/memes/-lib/__tests__/library-fakes'

const CATEGORIES = [
  buildFakeCategory({
    slug: 'triste',
    family: CategoryFamily.MOOD,
    memeCount: 3
  }),
  buildFakeCategory({
    slug: 'heureux',
    family: CategoryFamily.MOOD,
    memeCount: 8
  }),
  buildFakeCategory({
    slug: 'tele',
    family: CategoryFamily.SOURCE,
    memeCount: 20
  })
]

const NO_RESULTS = {
  categories: CATEGORIES,
  trendingMemes: [],
  memes: [],
  queryID: undefined,
  total: 0
}

const readGroups = (groups: ReturnType<typeof buildSearchSuggestionGroups>) => {
  return groups.map((group) => {
    return [
      group.id,
      group.items.map((item) => {
        return item.id
      })
    ]
  })
}

describe('buildSearchSuggestionGroups', () => {
  it('should offer the moods, most used first, and the trending Memes before any word', () => {
    const groups = buildSearchSuggestionGroups({
      ...NO_RESULTS,
      query: '',
      trendingMemes: [buildFakeMeme('trending-meme')]
    })

    expect(readGroups(groups)).toStrictEqual([
      ['moods', ['category-heureux', 'category-triste']],
      ['trending', ['trending-meme']]
    ])
  })

  it('should match a category from the start of its words, whatever the accents', () => {
    const groups = buildSearchSuggestionGroups({
      ...NO_RESULTS,
      query: 'TÉL',
      memes: [buildFakeMeme('tv-meme')],
      total: 1
    })

    expect(readGroups(groups)).toStrictEqual([
      ['categories', ['category-tele']],
      ['memes', ['tv-meme']],
      ['more', ['all', 'ai']]
    ])
  })

  it('should put the AI search first when the words read like a description', () => {
    const groups = buildSearchSuggestionGroups({
      ...NO_RESULTS,
      query: 'un chat qui tombe',
      memes: [buildFakeMeme('cat-meme')],
      total: 1
    })

    expect(
      groups.at(-1)?.items.map((item) => {
        return item.id
      })
    ).toStrictEqual(['ai', 'all'])
  })

  it('should only offer the AI search when no title matches', () => {
    const groups = buildSearchSuggestionGroups({ ...NO_RESULTS, query: 'zzz' })

    expect(readGroups(groups)).toStrictEqual([['more', ['ai']]])
  })
})
