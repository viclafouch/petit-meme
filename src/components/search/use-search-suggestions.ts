import { useDebouncedValue } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getLocale } from '~/paraglide/runtime'
import { listCategoriesQueryOpts } from '~/queries/category'
import { listMemesQueryOpts, listTrendingMemesQueryOpts } from '~/queries/meme'
import { buildSearchSuggestionGroups } from './search-suggestion-groups'

const QUERY_DEBOUNCE_MS = 300

export const useSearchSuggestions = (inputValue: string, isOpen: boolean) => {
  const [debouncedValue] = useDebouncedValue(inputValue, {
    wait: QUERY_DEBOUNCE_MS
  })
  const query = debouncedValue.trim()
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

  return {
    query,
    isPending: query !== '' && memesQuery.isPlaceholderData,
    groups: buildSearchSuggestionGroups({
      query,
      categories: categoriesQuery.data ?? [],
      trendingMemes: trendingMemesQuery.data ?? [],
      memes: memesQuery.data?.memes ?? [],
      queryID: memesQuery.data?.queryID,
      total: memesQuery.data?.total ?? 0
    })
  }
}
