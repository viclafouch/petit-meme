import React from 'react'
import { Crown, Send, Smartphone, Zap } from 'lucide-react'
import {
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery
} from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { BookmarkCardButton } from '~/components/bookmark/bookmark-card-button'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { ALL_CATEGORY_SLUG, type MemeWithVideo } from '~/constants/meme'
import { buildCapState, FREE_CAPS } from '~/helpers/cap'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
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

type DemoCardProps = {
  meme: MemeWithVideo
}

const DemoCard = ({ meme }: DemoCardProps) => {
  return (
    <figure className="relative mx-auto w-full max-w-72 shrink-0 -rotate-2 lg:mx-0">
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
          className="absolute top-2 right-2 z-(--z-floating) before:absolute before:inset-0 before:rounded-full before:border-2 before:border-current before:opacity-0 data-active:before:hidden motion-safe:before:animate-bookmark-ping"
        />
      </div>
      <figcaption className="mt-2 line-clamp-2 text-sm leading-snug font-semibold text-pretty">
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

type BookmarksIntroProps = {
  demoMeme: MemeWithVideo | undefined
  isFree: boolean
}

const BookmarksIntro = ({ demoMeme, isFree }: BookmarksIntroProps) => {
  const { user } = useRouteContext({ from: '__root__' })
  const dialogStore = useDialogStore()
  const titleId = React.useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-x-10 gap-y-12 rounded-3xl bg-foreground/3 px-5 pt-14 pb-8 inset-ring inset-ring-foreground/6 sm:px-8 lg:flex-row lg:items-center lg:px-12 lg:py-12"
    >
      {demoMeme ? <DemoCard meme={demoMeme} /> : null}
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
  const { isReached } = buildCapState({
    kind: 'bookmark',
    usedCount,
    isPremium
  })
  const [demoMeme, ...suggestedMemes] = trendingQuery.data ?? []
  const cards = flattenUniqueCards(pagesQuery.data.pages)

  return (
    <>
      <LibraryHeader title={m.nav_my_bookmarks()} count={usedCount}>
        {isPremium ? null : <CapMeter usedCount={usedCount} />}
      </LibraryHeader>
      <LibraryStrip />
      {isReached ? <CapReachedNotice /> : null}
      {cards.length === 0 ? (
        <>
          <BookmarksIntro demoMeme={demoMeme} isFree={!isPremium} />
          {suggestedMemes.length > 0 ? (
            <BookmarkSuggestions
              memes={suggestedMemes}
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
  const [demoMeme] = useQuery(listTrendingMemesQueryOpts()).data ?? []

  return (
    <>
      <LibraryHeader title={m.nav_my_bookmarks()} />
      <LibraryStrip />
      <BookmarksIntro demoMeme={demoMeme} isFree={false} />
    </>
  )
}

export const BookmarksPage = () => {
  const { user } = useRouteContext({ from: '__root__' })

  return user ? <SignedInBookmarks /> : <VisitorBookmarks />
}
