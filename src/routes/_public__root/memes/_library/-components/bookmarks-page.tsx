import { Crown, Send, Smartphone, Zap } from 'lucide-react'
import {
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery
} from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { BookmarkCardButton } from '~/components/bookmark/bookmark-card-button'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { LoadingSpinner } from '~/components/ui/spinner'
import { ALL_CATEGORY_SLUG, type MemeWithVideo } from '~/constants/meme'
import { buildCapState, FREE_CAPS } from '~/helpers/cap'
import { formatCount } from '~/helpers/number'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import {
  listBookmarkIdsQueryOpts,
  listBookmarksQueryOpts
} from '~/queries/bookmark'
import { listTrendingMemesQueryOpts } from '~/queries/meme'
import { flattenUniqueCards } from '~/routes/_public__root/memes/-lib/library'
import { useDialogStore } from '~/stores/dialog.store'
import { LibraryStrip } from './library-layout'
import { MemeCardGrid } from './meme-card-grid'
import { useLoadMoreWhenVisible } from './use-load-more-when-visible'

const STARTER_BOOKMARK_COUNT = 3

const BENEFITS = [
  { icon: Zap, label: m.bookmark_intro_benefit_find },
  { icon: Send, label: m.bookmark_intro_benefit_send },
  { icon: Smartphone, label: m.bookmark_intro_benefit_devices }
] as const

const useBookmarkCap = () => {
  const isPremium = useIsPremium()
  const usedCount = useSuspenseQuery(listBookmarkIdsQueryOpts()).data.length

  return {
    usedCount,
    ...buildCapState({ kind: 'bookmark', usedCount, isPremium })
  }
}

type BookmarksTitleProps = {
  count?: number
}

const BookmarksTitle = ({ count }: BookmarksTitleProps) => {
  return (
    <div className="flex min-w-0 flex-[1_1_15rem] flex-wrap items-baseline gap-x-3">
      <h1 className="min-w-0 font-bricolage text-xl leading-[1.1] font-semibold tracking-[-0.02em] lg:text-3xl">
        {m.nav_my_bookmarks()}
      </h1>
      {count ? (
        <p
          aria-live="polite"
          className="text-sm whitespace-nowrap text-muted-foreground tabular-nums"
        >
          {m.meme_library_count({
            count,
            formattedCount: formatCount(count, getLocale(), 'standard')
          })}
        </p>
      ) : null}
    </div>
  )
}

const CapMeter = () => {
  const cap = useBookmarkCap()

  if (cap.isPremium) {
    return null
  }

  return (
    <p className="flex items-center gap-2.5 text-sm text-muted-foreground tabular-nums">
      {m.bookmark_cap_meter({
        count: cap.usedCount,
        cap: FREE_CAPS.bookmark
      })}
      <span
        aria-hidden="true"
        className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/10"
      >
        <span
          className="block h-full origin-left scale-x-(--bookmark-cap-ratio) rounded-full bg-bookmark-fill transition-[scale] duration-(--duration-base) ease-out motion-reduce:transition-none"
          style={{
            '--bookmark-cap-ratio': Math.min(
              1,
              cap.usedCount / FREE_CAPS.bookmark
            )
          }}
        />
      </span>
    </p>
  )
}

const CapReachedBanner = () => {
  const cap = useBookmarkCap()

  if (!cap.isReached) {
    return null
  }

  return (
    <aside
      aria-labelledby="bookmark-cap-reached"
      className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-(image:--gradient-premium) px-4 py-3.5 text-(--color-premium-foreground) shadow-(--shadow-premium) sm:px-5"
    >
      <Crown aria-hidden="true" className="size-6 shrink-0 fill-current" />
      <div className="min-w-0 flex-[1_1_14rem]">
        <h2 id="bookmark-cap-reached" className="font-bricolage font-semibold">
          {m.bookmark_cap_reached_title({ cap: FREE_CAPS.bookmark })}
        </h2>
        <p className="text-sm text-pretty">
          {m.bookmark_cap_reached_description()}
        </p>
      </div>
      <Link
        to="/pricing"
        className="pill pill-sm bg-(--color-premium-foreground) text-white mouse:hover:not-disabled:bg-(--color-premium-foreground)/90"
      >
        {m.nav_upgrade_premium()}
      </Link>
    </aside>
  )
}

type DemoCardProps = {
  meme: MemeWithVideo
}

const DemoCard = ({ meme }: DemoCardProps) => {
  return (
    <figure className="relative mx-auto w-full max-w-72 -rotate-2 lg:mx-0">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-stage shadow-(--shadow-stage)">
        <img
          src={buildVideoImageUrl(meme.video.bunnyId)}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover"
        />
        <BookmarkCardButton
          memeId={meme.id}
          title={meme.title}
          className="bookmarks-demo-star absolute top-2 right-2 z-(--z-floating)"
        />
      </div>
      <figcaption className="mt-2 line-clamp-2 text-sm leading-[1.3] font-semibold text-pretty">
        {meme.title}
      </figcaption>
      <span
        aria-hidden="true"
        className="absolute -top-9 right-0 rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background after:absolute after:top-full after:right-4 after:border-6 after:border-transparent after:border-t-foreground"
      >
        {m.bookmark_intro_try()}
      </span>
    </figure>
  )
}

const useTrendingMemes = () => {
  const trendingQuery = useQuery(listTrendingMemesQueryOpts())

  return {
    memes: trendingQuery.data ?? [],
    updatedAt: trendingQuery.dataUpdatedAt
  }
}

const BookmarksIntro = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const dialogStore = useDialogStore()
  const isPremium = useIsPremium()
  const [demoMeme] = useTrendingMemes().memes

  return (
    <section
      aria-labelledby="bookmarks-intro"
      className="grid items-center gap-x-10 gap-y-12 rounded-3xl bg-(image:--gradient-bookmark-glow) px-5 pt-14 pb-8 inset-ring inset-ring-foreground/6 sm:px-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:px-12 lg:py-12"
    >
      {demoMeme ? <DemoCard meme={demoMeme} /> : null}
      <div className="flex max-w-prose flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2
            id="bookmarks-intro"
            className="font-bricolage text-2xl leading-[1.1] font-semibold tracking-[-0.02em] text-balance lg:text-4xl"
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
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bookmark-surface text-bookmark-foreground [&_svg]:size-4">
                  <benefit.icon aria-hidden="true" />
                </span>
                {benefit.label()}
              </li>
            )
          })}
        </ul>
        {user && !isPremium ? (
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

const BookmarkSuggestions = () => {
  const trending = useTrendingMemes()

  if (trending.memes.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="bookmark-suggestions" className="mt-12">
      <h2
        id="bookmark-suggestions"
        className="mb-4 font-bricolage text-lg font-semibold lg:text-xl"
      >
        {m.bookmark_suggestions_title()}
      </h2>
      <MemeCardGrid
        cards={trending.memes.map((meme, index) => {
          return { meme, position: index + 1 }
        })}
        now={trending.updatedAt}
        label={m.bookmark_suggestions_title()}
      />
    </section>
  )
}

type LoadMoreButtonProps = {
  isFetching: boolean
  hasFailed: boolean
  onLoadMore: () => void
}

const LoadMoreButton = ({
  isFetching,
  hasFailed,
  onLoadMore
}: LoadMoreButtonProps) => {
  const sentinelRef = useLoadMoreWhenVisible({
    isFetching,
    hasFailed,
    onLoadMore
  })

  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-3 pt-10">
      {hasFailed ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {m.error_bookmark_load()}
        </p>
      ) : null}
      <button
        type="button"
        className="pill pill-sm"
        aria-disabled={isFetching || undefined}
        onClick={() => {
          if (!isFetching) {
            onLoadMore()
          }
        }}
      >
        {isFetching ? <LoadingSpinner /> : null}
        {hasFailed ? m.common_retry() : m.meme_load_more()}
      </button>
    </div>
  )
}

const SignedInBookmarks = () => {
  const pagesQuery = useSuspenseInfiniteQuery(listBookmarksQueryOpts())
  const cards = flattenUniqueCards(pagesQuery.data.pages)
  const total = pagesQuery.data.pages[0]?.total ?? 0

  return (
    <>
      <header className="pb-3 lg:pb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <BookmarksTitle count={total} />
          <CapMeter />
        </div>
      </header>
      <LibraryStrip />
      <CapReachedBanner />
      {cards.length === 0 ? (
        <BookmarksIntro />
      ) : (
        <MemeCardGrid
          cards={cards}
          now={pagesQuery.dataUpdatedAt}
          label={m.nav_my_bookmarks()}
        >
          {pagesQuery.hasNextPage ? (
            <LoadMoreButton
              isFetching={pagesQuery.isFetchingNextPage}
              hasFailed={pagesQuery.isFetchNextPageError}
              onLoadMore={() => {
                void pagesQuery.fetchNextPage()
              }}
            />
          ) : null}
        </MemeCardGrid>
      )}
      {total < STARTER_BOOKMARK_COUNT ? <BookmarkSuggestions /> : null}
    </>
  )
}

export const BookmarksPage = () => {
  const { user } = useRouteContext({ from: '__root__' })

  if (user) {
    return <SignedInBookmarks />
  }

  return (
    <>
      <header className="pb-3 lg:pb-8">
        <BookmarksTitle />
      </header>
      <LibraryStrip />
      <BookmarksIntro />
    </>
  )
}
