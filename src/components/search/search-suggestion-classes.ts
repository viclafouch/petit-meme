import { cn } from '~/lib/utils'
import type { SearchSuggestionGroup } from './search-suggestion-groups'

type SuggestionLayout = SearchSuggestionGroup['layout']

export const SUGGESTION_GROUP_CLASS_NAMES = {
  list: 'not-first:mt-2 not-first:border-t not-first:border-foreground/6 not-first:pt-2',
  chips:
    'flex flex-wrap gap-1.5 px-1 not-first:mt-2 not-first:border-t not-first:border-foreground/6 not-first:pt-2 [&>ul]:flex [&>ul]:flex-wrap [&>ul]:gap-1.5'
} as const satisfies Record<SuggestionLayout, string>

export const SUGGESTION_HEADING_CLASS_NAMES = {
  list: 'px-2.5 py-1.5 text-xs font-medium text-muted-foreground',
  chips: 'basis-full px-1.5 py-1.5 text-xs font-medium text-muted-foreground'
} as const satisfies Record<SuggestionLayout, string>

const SUGGESTION_BASE_CLASS_NAME =
  'flex cursor-pointer touch-manipulation items-center text-start text-sm select-none focus-visible:focus-ring data-[kind=ai]:text-bookmark-foreground'

export const SUGGESTION_ITEM_CLASS_NAMES = {
  list: cn(
    SUGGESTION_BASE_CLASS_NAME,
    'min-h-11 w-full gap-3 rounded-lg px-2.5 py-1.5 data-highlighted:bg-secondary pointer-coarse:active:bg-secondary'
  ),
  chips: cn(
    SUGGESTION_BASE_CLASS_NAME,
    'min-h-9 gap-2 rounded-full bg-secondary py-1 pr-3 pl-1.5 data-highlighted:bg-secondary-hover data-highlighted:inset-ring data-highlighted:inset-ring-ring pointer-coarse:min-h-10'
  )
} as const satisfies Record<SuggestionLayout, string>
