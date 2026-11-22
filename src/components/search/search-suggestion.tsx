import { Search, Sparkles } from 'lucide-react'
import { CategoryEmojiImage } from '~/components/category/category-emoji-image'
import { Kbd } from '~/components/ui/kbd'
import { formatClockDuration } from '~/helpers/duration'
import { formatCount } from '~/helpers/number'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import type { SearchSuggestion } from './use-search-suggestions'

type SearchSuggestionContentProps = {
  suggestion: SearchSuggestion
}

export const SearchSuggestionContent = ({
  suggestion
}: SearchSuggestionContentProps) => {
  const locale = getLocale()

  if (suggestion.kind === 'category') {
    return (
      <>
        <CategoryEmojiImage
          emoji={suggestion.category.emoji}
          className="search-suggestion-emoji"
        />
        <span className="search-suggestion-label">
          {suggestion.category.title}
        </span>
      </>
    )
  }

  if (suggestion.kind === 'meme') {
    const { meme } = suggestion

    return (
      <>
        <span className="search-suggestion-thumb">
          <img
            src={buildVideoImageUrl(meme.video.bunnyId)}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <span>{formatClockDuration(meme.video.duration, locale)}</span>
        </span>
        <span className="search-suggestion-label search-suggestion-title">
          {meme.title}
        </span>
        <span className="search-suggestion-meta">
          {m.meme_views({
            count: meme.viewCount,
            formattedCount: formatCount(meme.viewCount, locale, 'compact')
          })}
        </span>
      </>
    )
  }

  if (suggestion.kind === 'ai') {
    return (
      <>
        <span className="search-suggestion-icon" data-tone="ai">
          <Sparkles aria-hidden="true" />
        </span>
        <span className="search-suggestion-stack">
          <span className="search-suggestion-label">
            {m.search_ask_ai_query({ query: suggestion.query })}
          </span>
          <span className="search-suggestion-meta">
            {suggestion.total === 0
              ? m.search_ai_no_match()
              : m.search_ai_describe()}
          </span>
        </span>
      </>
    )
  }

  return (
    <>
      <span className="search-suggestion-icon">
        <Search aria-hidden="true" />
      </span>
      <span className="search-suggestion-label">
        {m.search_see_all_count({
          count: suggestion.total,
          formattedCount: formatCount(suggestion.total, locale, 'standard'),
          query: suggestion.query
        })}
      </span>
      <Kbd className="search-suggestion-kbd pointer-coarse:hidden">↵</Kbd>
    </>
  )
}
