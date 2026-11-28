import { ChevronRight } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MemeCardGrid } from '~/components/meme/meme-card-grid'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { formatCount } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { countLibraryMemesQueryOpts } from '~/queries/category'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { HOME_TRENDING_COUNT } from '~/routes/_public__root/-lib/home'

export const HomeTrending = () => {
  const locale = getLocale()
  const trendingQuery = useSuspenseQuery(listTrendingMemesQueryOpts())
  const libraryCountQuery = useSuspenseQuery(countLibraryMemesQueryOpts(locale))
  const cards = trendingQuery.data
    .slice(0, HOME_TRENDING_COUNT)
    .map((meme, index) => {
      return { meme, position: index + 1 }
    })

  return (
    <section
      aria-labelledby="home-trending"
      className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="home-trending"
          className="font-bricolage text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl"
        >
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
        className="pill pill-sm max-sm:order-last max-sm:w-full"
      >
        {m.home_trending_all({
          count: libraryCountQuery.data,
          formattedCount: formatCount(
            libraryCountQuery.data,
            locale,
            'standard'
          )
        })}
        <ChevronRight aria-hidden="true" className="max-sm:hidden" />
      </Link>
      <div className="sm:col-span-2">
        <MemeCardGrid
          cards={cards}
          now={trendingQuery.dataUpdatedAt}
          label={m.home_trending_list_label()}
          titleTag="h3"
          layout="showcase"
        />
      </div>
    </section>
  )
}
