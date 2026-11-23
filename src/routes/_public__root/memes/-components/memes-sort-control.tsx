import React from 'react'
import { motion, useReducedMotion, type Transition } from 'motion/react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { getRouteApi } from '@tanstack/react-router'
import { MEMES_SORTS, type MemesSort } from '~/constants/meme'
import { resolveLibraryFilters, resolveMemesSort } from '~/helpers/memes-sort'
import { m } from '~/paraglide/messages'

const categoryRouteApi = getRouteApi('/_public__root/memes/category/$slug')

const PILL_SPRING = {
  type: 'spring',
  bounce: 0,
  duration: 0.35
} as const satisfies Transition

const PILL_INSTANT = { duration: 0 } as const satisfies Transition

const SORT_LABELS = {
  trending: m.meme_sort_trending,
  new: m.meme_sort_new,
  popular: m.meme_sort_popular,
  relevance: m.meme_sort_relevance
} as const satisfies Record<MemesSort, () => string>

export const MemesSortControl = () => {
  const { slug } = categoryRouteApi.useParams()
  const search = categoryRouteApi.useSearch()
  const navigate = categoryRouteApi.useNavigate()
  const { category, sort: resolvedSort } = resolveLibraryFilters({
    slug,
    query: search.query,
    sort: search.sort
  })
  const [sort, setSort] = React.useState(resolvedSort)
  const [previousResolvedSort, setPreviousResolvedSort] =
    React.useState(resolvedSort)
  const pillId = React.useId()
  const isReducedMotion = useReducedMotion()
  const defaultSort = resolveMemesSort({ query: search.query, category })
  const sorts = MEMES_SORTS.filter((option) => {
    return (
      resolveMemesSort({ sort: option, query: search.query, category }) ===
      option
    )
  })

  if (previousResolvedSort !== resolvedSort) {
    setPreviousResolvedSort(resolvedSort)
    setSort(resolvedSort)
  }

  const handleValueChange = (nextSort: MemesSort) => {
    setSort(nextSort)
    void navigate({
      to: '.',
      search: (previous) => {
        return {
          ...previous,
          sort: nextSort === defaultSort ? undefined : nextSort,
          page: undefined
        }
      },
      replace: true,
      resetScroll: false
    })
  }

  return (
    <RadioGroup<MemesSort>
      aria-label={m.meme_sort_label()}
      value={sort}
      onValueChange={handleValueChange}
      className="scrollbar-hidden isolate inline-flex max-w-full overflow-x-auto rounded-full bg-secondary p-0.5"
    >
      {sorts.map((option) => {
        return (
          <Radio.Root
            key={option}
            value={option}
            className="relative inline-flex h-8 shrink-0 cursor-pointer touch-manipulation items-center rounded-full px-3 text-label font-medium whitespace-nowrap text-foreground/65 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-color) active:scale-(--scale-press) pointer-coarse:h-9 data-checked:text-foreground mouse:hover:text-foreground"
          >
            {option === sort ? (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 -z-1 rounded-full bg-background shadow-[0_1px_2px_var(--color-shade-faint)] ring-1 ring-foreground/6"
                transition={isReducedMotion ? PILL_INSTANT : PILL_SPRING}
              />
            ) : null}
            {SORT_LABELS[option]()}
          </Radio.Root>
        )
      })}
    </RadioGroup>
  )
}
