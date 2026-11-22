import { useDebouncedValue } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CategoryFamily } from '~/db/generated/prisma/enums'
import { splitIntoSearchWords } from '~/helpers/keywords'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listCategoriesQueryOpts } from '~/queries/category'
import { listMemesQueryOpts, listTrendingMemesQueryOpts } from '~/queries/meme'
import type { listCategories } from '~/server/category/category.functions'
import type { listMemes } from '~/server/meme/meme-list.functions'

const QUERY_DEBOUNCE_MS = 150
const MOOD_SUGGESTION_COUNT = 6
const TRENDING_SUGGESTION_COUNT = 4
const CATEGORY_SUGGESTION_COUNT = 4
const MEME_SUGGESTION_COUNT = 6
const AI_PROMPT_MIN_WORDS = 3

export type SuggestedCategory = Awaited<
  ReturnType<typeof listCategories>
>[number]

type SuggestedMeme = Awaited<ReturnType<typeof listMemes>>['memes'][number]

export type SearchSuggestion =
  | { kind: 'category'; id: string; category: SuggestedCategory }
  | {
      kind: 'meme'
      id: string
      meme: SuggestedMeme
      position: number
      queryID: string | undefined
    }
  | { kind: 'all'; id: string; query: string; total: number }
  | { kind: 'ai'; id: string; query: string; total: number }

type SearchSuggestionGroupId =
  | 'moods'
  | 'trending'
  | 'categories'
  | 'memes'
  | 'more'

export const SEARCH_GROUP_LABELS = {
  moods: m.search_group_moods,
  trending: m.search_group_trending,
  categories: m.search_group_categories,
  memes: m.search_group_memes,
  more: m.search_group_more
} as const satisfies Record<SearchSuggestionGroupId, () => string>

export type SearchSuggestionGroup = {
  id: SearchSuggestionGroupId
  layout: 'chips' | 'list'
  items: SearchSuggestion[]
}

const matchCategory = (category: SuggestedCategory, queryWords: string[]) => {
  const titleWords = splitIntoSearchWords(category.title)

  return queryWords.every((queryWord) => {
    return titleWords.some((titleWord) => {
      return titleWord.startsWith(queryWord)
    })
  })
}

const toMemeSuggestions = (
  memes: SuggestedMeme[],
  queryID: string | undefined,
  count: number
): SearchSuggestion[] => {
  return memes.slice(0, count).map((meme, index) => {
    return { kind: 'meme', id: meme.id, meme, position: index + 1, queryID }
  })
}

const sortByMemeCount = (categories: SuggestedCategory[]) => {
  return categories.toSorted((first, second) => {
    return second.memeCount - first.memeCount
  })
}

export const useSearchSuggestions = (inputValue: string, isOpen: boolean) => {
  const [debouncedValue] = useDebouncedValue(inputValue, {
    wait: QUERY_DEBOUNCE_MS
  })
  const query = debouncedValue.trim()
  const queryWords = splitIntoSearchWords(query)
  const categoriesQuery = useQuery({
    ...listCategoriesQueryOpts(getLocale()),
    enabled: isOpen
  })
  const trendingMemesQuery = useQuery({
    ...listTrendingMemesQueryOpts(),
    enabled: isOpen && query === ''
  })
  const memesQuery = useQuery({
    ...listMemesQueryOpts({ query }),
    enabled: isOpen && query !== '',
    placeholderData: keepPreviousData
  })
  const categories = categoriesQuery.data ?? []
  const memes = memesQuery.data?.memes ?? []
  const queryID = memesQuery.data?.queryID

  if (query === '') {
    const moods = sortByMemeCount(
      categories.filter((category) => {
        return category.family === CategoryFamily.MOOD
      })
    ).slice(0, MOOD_SUGGESTION_COUNT)
    const groups: SearchSuggestionGroup[] = [
      {
        id: 'moods',
        layout: 'chips',
        items: moods.map((category) => {
          return { kind: 'category', id: category.id, category }
        })
      },
      {
        id: 'trending',
        layout: 'list',
        items: toMemeSuggestions(
          trendingMemesQuery.data ?? [],
          undefined,
          TRENDING_SUGGESTION_COUNT
        )
      }
    ]

    return {
      query,
      isPending: false,
      groups: groups.filter((group) => {
        return group.items.length > 0
      })
    }
  }

  const total = memesQuery.data?.total ?? 0
  const isAiFirst = queryWords.length >= AI_PROMPT_MIN_WORDS || total === 0
  const ai: SearchSuggestion = { kind: 'ai', id: 'ai', query, total }
  const all: SearchSuggestion = { kind: 'all', id: 'all', query, total }
  const matchingCategories = sortByMemeCount(
    categories.filter((category) => {
      return matchCategory(category, queryWords)
    })
  ).slice(0, CATEGORY_SUGGESTION_COUNT)
  const groups: SearchSuggestionGroup[] = [
    {
      id: 'categories',
      layout: 'chips',
      items: matchingCategories.map((category) => {
        return { kind: 'category', id: category.id, category }
      })
    },
    {
      id: 'memes',
      layout: 'list',
      items: toMemeSuggestions(memes, queryID, MEME_SUGGESTION_COUNT)
    },
    {
      id: 'more',
      layout: 'list',
      items: isAiFirst ? [ai, ...(total > 0 ? [all] : [])] : [all, ai]
    }
  ]

  return {
    query,
    isPending: memesQuery.isPlaceholderData,
    groups: groups.filter((group) => {
      return group.items.length > 0
    })
  }
}
