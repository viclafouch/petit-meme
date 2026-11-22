import React from 'react'
import { motion, useReducedMotion, type Transition } from 'motion/react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { getRouteApi } from '@tanstack/react-router'
import { MEMES_SORTS, type MemesSort } from '~/constants/meme'
import { resolveMemesSort } from '~/helpers/memes-sort'
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
  const search = categoryRouteApi.useSearch()
  const navigate = categoryRouteApi.useNavigate()
  const resolvedSort = resolveMemesSort(search)
  const [sort, setSort] = React.useState(resolvedSort)
  const [previousResolvedSort, setPreviousResolvedSort] =
    React.useState(resolvedSort)
  const pillId = React.useId()
  const isReducedMotion = useReducedMotion()
  const defaultSort = resolveMemesSort({ query: search.query })
  const sorts = MEMES_SORTS.filter((option) => {
    return resolveMemesSort({ sort: option, query: search.query }) === option
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
      className="memes-sort"
    >
      {sorts.map((option) => {
        return (
          <Radio.Root key={option} value={option} className="memes-sort-item">
            {option === sort ? (
              <motion.span
                layoutId={pillId}
                className="memes-sort-pill"
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
