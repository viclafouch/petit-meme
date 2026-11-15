import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import {
  type Transition,
  LayoutGroup,
  motion,
  useReducedMotion
} from 'motion/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import { buttonVariants } from '~/components/ui/button'
import { getVirtualCategories, type MemesFilters } from '~/constants/meme'
import { useScrollOverflow } from '~/hooks/use-scroll-overflow'
import { useScrollerControls } from '~/hooks/use-scroller-controls'
import { cn } from '~/lib/utils'
import { getLocale } from '~/paraglide/runtime'
import { listCategoriesQueryOpts } from '~/queries/category'

const resetPageSearch = (prevState: MemesFilters) => {
  return {
    page: undefined,
    query: prevState.query
  }
}

const BUBBLE_TRANSITION_INSTANT = { duration: 0 } as const satisfies Transition
const BUBBLE_TRANSITION_SPRING = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  bounce: 0
} as const satisfies Transition

const SCROLL_ARROWS = {
  start: { direction: -1, positionClassName: 'start-0', Icon: ChevronLeftIcon },
  end: { direction: 1, positionClassName: 'end-0', Icon: ChevronRightIcon }
} as const

type ScrollArrowProps = {
  side: keyof typeof SCROLL_ARROWS
  isVisible: boolean
  onScrollByPage: (direction: -1 | 1) => void
}

const ScrollArrow = ({ side, isVisible, onScrollByPage }: ScrollArrowProps) => {
  const { direction, positionClassName, Icon } = SCROLL_ARROWS[side]

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-visible={isVisible || undefined}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onClick={() => {
        onScrollByPage(direction)
      }}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'icon-sm' }),
        'absolute inset-y-0 my-auto hidden rounded-full dark:bg-background dark:hover:bg-muted opacity-0 pointer-events-none transition-opacity duration-150 ease-out mouse:flex data-visible:opacity-100 data-visible:pointer-events-auto',
        positionClassName
      )}
    >
      <Icon />
    </button>
  )
}

const isNewTabClick = (event: React.MouseEvent) => {
  return event.metaKey || event.ctrlKey || event.shiftKey
}

export const CategoriesList = () => {
  const categoriesQuery = useSuspenseQuery(listCategoriesQueryOpts(getLocale()))
  const { slug: activeSlug } = useParams({ strict: false })
  const { query } = useSearch({ strict: false })
  const hasSearchQuery = Boolean(query)
  const isReducedMotion = useReducedMotion()
  const [hasInteracted, setHasInteracted] = React.useState(false)
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const activeLinkRef = React.useRef<HTMLAnchorElement>(null)
  const { hasMoreStart, hasMoreEnd } = useScrollOverflow(scrollerRef, listRef)
  const { scrollByPage, scrollToStart, centerItem } = useScrollerControls(
    scrollerRef,
    activeLinkRef
  )

  const categories = React.useMemo(() => {
    return [...getVirtualCategories(), ...categoriesQuery.data]
  }, [categoriesQuery.data])

  const bubbleTransition =
    isReducedMotion || !hasInteracted
      ? BUBBLE_TRANSITION_INSTANT
      : BUBBLE_TRANSITION_SPRING

  return (
    <LayoutGroup id="categories">
      <div className="relative">
        <div
          ref={scrollerRef}
          className="relative w-full overflow-x-auto overscroll-x-contain no-scrollbar scroll-fade-x scroll-px-12 py-2 [--scroll-fade-size:--spacing(12)]"
        >
          <ul ref={listRef} className="flex items-center gap-x-2">
            {categories.map((category) => {
              const isActive = !hasSearchQuery && activeSlug === category.slug

              return (
                <li key={category.id} className="shrink-0">
                  {isActive ? (
                    <Link
                      ref={activeLinkRef}
                      to="/memes"
                      replace
                      resetScroll={false}
                      aria-current="true"
                      search={resetPageSearch}
                      onClick={(event) => {
                        if (!isNewTabClick(event)) {
                          scrollToStart()
                        }
                      }}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'touch-tap relative isolate forced-colors:outline-2 forced-colors:-outline-offset-2 forced-colors:outline-solid'
                      )}
                    >
                      <motion.span
                        layoutId="category-bubble"
                        className="absolute inset-0 bg-primary rounded-md"
                        transition={bubbleTransition}
                      />
                      <span className="relative z-10 text-white mix-blend-difference forced-colors:mix-blend-normal">
                        {category.title}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      to="/memes/category/$slug"
                      replace
                      resetScroll={false}
                      params={{ slug: category.slug }}
                      onClick={(event) => {
                        if (!isNewTabClick(event)) {
                          setHasInteracted(true)
                          centerItem(event.currentTarget)
                        }
                      }}
                      search={resetPageSearch}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'touch-tap'
                      )}
                    >
                      {category.title}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <ScrollArrow
          side="start"
          isVisible={hasMoreStart}
          onScrollByPage={scrollByPage}
        />
        <ScrollArrow
          side="end"
          isVisible={hasMoreEnd}
          onScrollByPage={scrollByPage}
        />
      </div>
    </LayoutGroup>
  )
}
