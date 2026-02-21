import React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { VIRTUAL_CATEGORIES } from '@/constants/meme'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'

export const CategoriesList = () => {
  const categoriesQuery = useSuspenseQuery(getCategoriesListQueryOpts())

  const { slug: activeSlug } = useParams({ strict: false })

  // eslint-disable-next-line no-restricted-syntax
  const categories = React.useMemo(() => {
    return [...VIRTUAL_CATEGORIES, ...categoriesQuery.data]
  }, [categoriesQuery.data])

  return (
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
                  search={(prevState) => {
                    return {
                      page: undefined,
                      query: prevState.query
                    }
                  }}
                  className={buttonVariants({
                    variant: 'default',
                    size: 'sm'
                  })}
                >
                  {category.title}
                </Link>
              ) : (
                <Link
                  to="/memes/category/$slug"
                  replace
                  resetScroll={false}
                  params={{ slug: category.slug }}
                  search={(prevState) => {
                    return {
                      page: undefined,
                      query: prevState.query
                    }
                  }}
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
  )
}
