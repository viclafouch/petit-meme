import React from 'react'
import type { Transition } from 'motion/react'
import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { buttonVariants } from '@/components/ui/button'
import type { MemesFilters } from '@/constants/meme'
import { getVirtualCategories } from '@/constants/meme'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { getLocale } from '@/paraglide/runtime'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'

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

export const CategoriesList = () => {
  const categoriesQuery = useSuspenseQuery(
    getCategoriesListQueryOpts(getLocale())
  )
  const { slug: activeSlug } = useParams({ strict: false })
  const prefersReducedMotion = useReducedMotion()
  const [hasInteracted, setHasInteracted] = React.useState(false)

  // eslint-disable-next-line no-restricted-syntax -- stable reference for the merged categories array
  const categories = React.useMemo(() => {
    return [...getVirtualCategories(), ...categoriesQuery.data]
  }, [categoriesQuery.data])

  const bubbleTransition =
    prefersReducedMotion || !hasInteracted
      ? BUBBLE_TRANSITION_INSTANT
      : BUBBLE_TRANSITION_SPRING

  return (
    <LayoutGroup id="categories">
      <div className="w-full overflow-x-auto no-scrollbar py-2">
        <ul className="flex items-center gap-x-2">
          {categories.map((category) => {
            const isActive = activeSlug === category.slug

            return (
              <li key={category.id} className="shrink-0">
                {isActive ? (
                  <Link
                    to="/memes"
                    replace
                    resetScroll={false}
                    aria-current="true"
                    search={resetPageSearch}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'relative'
                    )}
                  >
                    <motion.span
                      layoutId="category-bubble"
                      className="absolute inset-0 bg-primary rounded-md"
                      transition={bubbleTransition}
                    />
                    <span className="relative z-10 text-white mix-blend-difference">
                      {category.title}
                    </span>
                  </Link>
                ) : (
                  <Link
                    to="/memes/category/$slug"
                    replace
                    resetScroll={false}
                    params={{ slug: category.slug }}
                    onClick={() => {
                      setHasInteracted(true)
                    }}
                    search={resetPageSearch}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm'
                    })}
                  >
                    {category.title}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </LayoutGroup>
  )
}
