import React from 'react'
import { Crown, Send, Smartphone, Star, Zap } from 'lucide-react'
import {
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery
} from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { ALL_CATEGORY_SLUG, type MemeWithVideo } from '~/constants/meme'
import { buildCapState, FREE_CAPS } from '~/helpers/cap'
import { m } from '~/paraglide/messages'
import {
  countBookmarksQueryOpts,
  listBookmarksQueryOpts
} from '~/queries/bookmark'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { flattenUniqueCards } from '~/routes/_public__root/memes/-lib/library'
import { useDialogStore } from '~/stores/dialog.store'
import { LibraryHeader, LibraryStrip } from './library-layout'
import { LoadMore, MemeCardGrid } from './meme-card-grid'

const BENEFITS = [
  { icon: Zap, label: m.bookmark_intro_benefit_find },
  { icon: Send, label: m.bookmark_intro_benefit_send },
  { icon: Smartphone, label: m.bookmark_intro_benefit_devices }
] as const

type CapMeterProps = {
  usedCount: number
}

const CapMeter = ({ usedCount }: CapMeterProps) => {
  const labelId = React.useId()

  return (
    <p className="flex items-center gap-2.5 text-sm text-muted-foreground tabular-nums">
      <span id={labelId}>
        {m.bookmark_cap_meter({ count: usedCount, cap: FREE_CAPS.bookmark })}
      </span>
      <progress
        aria-labelledby={labelId}
        value={Math.min(usedCount, FREE_CAPS.bookmark)}
        max={FREE_CAPS.bookmark}
        className="bookmark-cap-meter h-1.5 w-20 rounded-full bg-foreground/10"
      />
    </p>
  )
}

const CapReachedNotice = () => {
  const titleId = React.useId()

  return (
    <aside
      aria-labelledby={titleId}
      className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-secondary px-4 py-3.5 sm:px-5"
    >
      <Crown aria-hidden="true" className="size-6 shrink-0" />
      <div className="min-w-0 grow basis-56">
        <h2 id={titleId} className="font-bricolage font-semibold">
          {m.bookmark_cap_reached_title({ cap: FREE_CAPS.bookmark })}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {m.bookmark_cap_reached_description()}
        </p>
      </div>
      <Link to="/pricing" className="pill pill-sm pill-brand">
        {m.nav_upgrade_premium()}
      </Link>
    </aside>
  )
}

const DEMO_SPARK_COUNT = 6

const DemoCard = () => {
  return (
    <figure
      aria-hidden="true"
      className="relative mx-auto w-full max-w-72 shrink-0 -rotate-2 lg:mx-0"
    >
      <div className="bookmark-demo-glow absolute -inset-3 z-(--z-behind) rounded-3xl" />
      <div className="bookmark-demo-frame relative rounded-xl bg-foreground/8 p-0.5">
        <div className="relative aspect-video overflow-hidden bg-stage">
          <img
            src="/images/bookmark-demo.webp"
            alt=""
            fetchPriority="high"
            decoding="async"
            className="size-full object-cover"
          />
          <span className="bookmark-chip absolute top-2 right-2">
            <Star className="size-4" />
            <Star className="bookmark-demo-star-on absolute size-4 fill-bookmark-fill stroke-bookmark-stroke" />
            {Array.from({ length: DEMO_SPARK_COUNT }, (_, index) => {
              return (
                <span
                  key={index}
                  className="bookmark-demo-spark"
                  style={{ '--spark-turn': index / DEMO_SPARK_COUNT }}
                />
              )
            })}
          </span>
        </div>
      </div>
      <figcaption className="mt-3 line-clamp-2 text-sm leading-snug font-semibold text-pretty">
        {m.bookmark_demo_title()}
      </figcaption>
    </figure>
  )
}

type BookmarksIntroProps = {
  isFree: boolean
}

const BookmarksIntro = ({ isFree }: BookmarksIntroProps) => {
  const { user } = useRouteContext({ from: '__root__' })
  const dialogStore = useDialogStore()
  const titleId = React.useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-x-10 gap-y-12 rounded-3xl bg-foreground/3 px-5 pt-14 pb-8 inset-ring inset-ring-foreground/6 sm:px-8 lg:flex-row lg:items-center lg:px-12 lg:py-12"
    >
      <DemoCard />
      <div className="flex max-w-prose flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2
            id={titleId}
            className="font-bricolage text-2xl leading-tight font-semibold tracking-tight text-balance lg:text-4xl"
          >
            {m.bookmark_intro_title()}
          </h2>
          <p className="text-pretty text-muted-foreground">
            {m.bookmark_intro_description()}
          </p>
        </div>
        <ul className="flex flex-col gap-2.5 text-sm">
          {BENEFITS.map((benefit) => {
            return (
              <li key={benefit.label()} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/6 [&_svg]:size-4">
                  <benefit.icon aria-hidden="true" />
                </span>
                {benefit.label()}
              </li>
            )
          })}
        </ul>
        {isFree ? (
          <p className="text-sm text-muted-foreground">
            {m.bookmark_intro_free_cap({ cap: FREE_CAPS.bookmark })}
          </p>
        ) : null}
        {user ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="pill pill-brand"
              onClick={() => {
                dialogStore.actions.showDialog('auth')
              }}
            >
              {m.bookmark_intro_sign_in()}
            </button>
            <Link
              to="/memes/category/$slug"
              params={{ slug: ALL_CATEGORY_SLUG }}
              className="pill"
            >
              {m.meme_empty_see_all()}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

type BookmarkSuggestionsProps = {
  memes: MemeWithVideo[]
  now: number
}

const BookmarkSuggestions = ({ memes, now }: BookmarkSuggestionsProps) => {
  const titleId = React.useId()

  return (
    <section aria-labelledby={titleId} className="mt-12">
      <h2
        id={titleId}
        className="mb-4 font-bricolage text-lg font-semibold lg:text-xl"
      >
        {m.bookmark_suggestions_title()}
      </h2>
      <MemeCardGrid
        layout="row"
        cards={memes.map((meme, index) => {
          return { meme, position: index + 1 }
        })}
        now={now}
        label={m.bookmark_suggestions_title()}
      />
    </section>
  )
}

const SignedInBookmarks = () => {
  const pagesQuery = useSuspenseInfiniteQuery(listBookmarksQueryOpts())
  const usedCount = useSuspenseQuery(countBookmarksQueryOpts()).data
  const trendingQuery = useQuery(listTrendingMemesQueryOpts())
  const isPremium = useIsPremium()
  const trendingMemes = trendingQuery.data ?? []
  const cards = flattenUniqueCards(pagesQuery.data.pages)
  const { isReached } = buildCapState({
    kind: 'bookmark',
    usedCount: pagesQuery.data.pages[0]?.total ?? 0,
    isPremium
  })

  return (
    <>
      <LibraryHeader title={m.nav_my_bookmarks()} count={usedCount}>
        {isPremium ? null : <CapMeter usedCount={usedCount} />}
      </LibraryHeader>
      <LibraryStrip />
      {isReached ? <CapReachedNotice /> : null}
      {cards.length === 0 ? (
        <>
          <BookmarksIntro isFree={!isPremium} />
          {trendingMemes.length > 0 ? (
            <BookmarkSuggestions
              memes={trendingMemes}
              now={trendingQuery.dataUpdatedAt}
            />
          ) : null}
        </>
      ) : (
        <MemeCardGrid
          cards={cards}
          now={pagesQuery.dataUpdatedAt}
          label={m.nav_my_bookmarks()}
        >
          {pagesQuery.hasNextPage ? (
            <LoadMore
              isFetching={pagesQuery.isFetchingNextPage}
              hasFailed={pagesQuery.isFetchNextPageError}
              failedMessage={m.error_bookmark_load()}
              onLoadMore={() => {
                void pagesQuery.fetchNextPage()
              }}
            />
          ) : null}
        </MemeCardGrid>
      )}
    </>
  )
}

const VisitorBookmarks = () => {
  return (
    <>
      <LibraryHeader title={m.nav_my_bookmarks()} />
      <LibraryStrip />
      <BookmarksIntro isFree={false} />
    </>
  )
}

export const BookmarksPage = () => {
  const { user } = useRouteContext({ from: '__root__' })

  return user ? <SignedInBookmarks /> : <VisitorBookmarks />
}
