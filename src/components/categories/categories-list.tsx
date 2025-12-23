import React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'

export const CategoriesList = () => {
  const categories = useSuspenseQuery(getCategoriesListQueryOpts())

  const { slug: activeSlug } = useParams({ strict: false })

  return (
    <div className="w-full overflow-x-auto max-w-full no-scrollbar py-2">
      <ul className="flex items-center gap-x-2">
        {categories.data.map((category) => {
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
