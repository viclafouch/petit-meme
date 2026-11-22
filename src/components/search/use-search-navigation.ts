import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { AI_SEARCH_PROMPT_STORAGE_KEY } from '~/constants/ai-search'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { sendClickEvent } from '~/lib/algolia-insights'
import type { SearchSuggestion } from './use-search-suggestions'

export const useSearchNavigation = () => {
  const navigate = useNavigate()
  const { user } = useRouteContext({ from: '__root__' })

  const showResults = (query: string) => {
    void navigate({
      to: '/memes/category/$slug',
      params: { slug: ALL_CATEGORY_SLUG },
      search: { query: query === '' ? undefined : query }
    })
  }

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.kind === 'meme') {
      sendClickEvent({
        queryID: suggestion.queryID,
        objectID: suggestion.meme.id,
        position: suggestion.position,
        authenticatedUserToken: user?.id
      })
      void navigate({
        to: '/memes/$memeId',
        params: { memeId: suggestion.meme.id }
      })

      return
    }

    if (suggestion.kind === 'ai') {
      sessionStorage.setItem(AI_SEARCH_PROMPT_STORAGE_KEY, suggestion.query)
      void navigate({ to: '/memes/ai-search' })

      return
    }

    if (suggestion.kind === 'all') {
      showResults(suggestion.query)

      return
    }

    void navigate({
      to: '/memes/category/$slug',
      params: { slug: suggestion.category.slug }
    })
  }

  return { showResults, selectSuggestion }
}
