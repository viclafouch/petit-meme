import { ChevronRight } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { formatCount } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { countLibraryMemesQueryOpts } from '~/queries/category'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { HOME_TRENDING_COUNT } from '~/routes/_public__root/-lib/home'
import { MemeCardGrid } from '~/routes/_public__root/memes/_library/-components/meme-card-grid'

export const HomeTrending = () => {
  const locale = getLocale()
  const trendingQuery = useSuspenseQuery(listTrendingMemesQueryOpts())
  const libraryCountQuery = useSuspenseQuery(countLibraryMemesQueryOpts(locale))
  const libraryLabel = m.home_trending_all({
    count: libraryCountQuery.data,
    formattedCount: formatCount(libraryCountQuery.data, locale, 'standard')
  })
  const cards = trendingQuery.data
    .slice(0, HOME_TRENDING_COUNT)
    .map((meme, index) => {
      return { meme, position: index + 1 }
    })

  return (
    <section aria-labelledby="home-trending" className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 id="home-trending" className="home-section-heading">
            {m.home_trending_title()}
          </h2>
          <p className="max-w-[56ch] text-muted-foreground text-pretty sm:text-lg">
            {m.home_trending_description()}
          </p>
        </div>
        <Link
          to="/memes/category/$slug"
          params={{ slug: ALL_CATEGORY_SLUG }}
          search={{ sort: 'trending' }}
          className="pill pill-sm shrink-0 max-sm:hidden"
        >
          {libraryLabel}
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>
      <div className="home-meme-grid">
        <MemeCardGrid
          cards={cards}
          now={trendingQuery.dataUpdatedAt}
          label={m.home_trending_list_label()}
          titleTag="h3"
        />
      </div>
      <Link
        to="/memes/category/$slug"
        params={{ slug: ALL_CATEGORY_SLUG }}
        search={{ sort: 'trending' }}
        className="pill w-full sm:hidden"
      >
        {libraryLabel}
      </Link>
    </section>
  )
}
