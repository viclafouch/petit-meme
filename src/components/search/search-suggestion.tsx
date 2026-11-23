import { Search, Sparkles } from 'lucide-react'
import { CategoryEmojiImage } from '~/components/category/category-emoji-image'
import { Kbd } from '~/components/ui/kbd'
import { formatClockDuration } from '~/helpers/duration'
import { formatCount } from '~/helpers/number'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import type { SearchSuggestion } from './search-suggestion-groups'

const SUGGESTION_ICON_CLASS_NAME =
  'grid size-8 shrink-0 place-items-center rounded-md [&_svg]:size-4'

const SUGGESTION_META_CLASS_NAME =
  'shrink-0 text-xs text-muted-foreground tabular-nums'

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
          className="size-5.5"
        />
        <span className="truncate">{suggestion.category.title}</span>
      </>
    )
  }

  if (suggestion.kind === 'meme') {
    const { meme } = suggestion

    return (
      <>
        <span className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md bg-stage">
          <img
            src={buildVideoImageUrl(meme.video.bunnyId)}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          <span className="absolute right-1 bottom-1 rounded-sm bg-shade-strong px-1 text-2xs text-white tabular-nums">
            {formatClockDuration(meme.video.duration, locale)}
          </span>
        </span>
        <span className="line-clamp-2 min-w-0 flex-1 wrap-anywhere">
          {meme.title}
        </span>
        <span className={SUGGESTION_META_CLASS_NAME}>
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
        <span className={cn(SUGGESTION_ICON_CLASS_NAME, 'bg-bookmark-surface')}>
          <Sparkles aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">
            {m.search_ask_ai_query({ query: suggestion.query })}
          </span>
          <span className={SUGGESTION_META_CLASS_NAME}>
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
      <span className={cn(SUGGESTION_ICON_CLASS_NAME, 'bg-foreground/10')}>
        <Search aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate">
        {m.search_see_all_count({
          count: suggestion.total,
          formattedCount: formatCount(suggestion.total, locale, 'standard'),
          query: suggestion.query
        })}
      </span>
      <Kbd className="shrink-0 pointer-coarse:hidden">↵</Kbd>
    </>
  )
}
