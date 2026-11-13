import React from 'react'
import { RefreshCw, Search, Sparkles } from 'lucide-react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { useDebouncedCallback } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router'
import { TAB_ITEM_CLASS } from '~/components/layout/tab-bar/tab-item-class'
import { MemeHighlightedTitle } from '~/components/meme/meme-highlighted-title'
import type { MemeWithHighlight } from '~/components/meme/memes-list'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer'
import { Input } from '~/components/ui/input'
import { LoadingSpinner } from '~/components/ui/spinner'
import { ALL_CATEGORY_SLUG, getVirtualCategories } from '~/constants/meme'
import { sendClickEvent } from '~/lib/algolia-insights'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listCategoriesQueryOpts } from '~/queries/category'
import { listMemesQueryOpts } from '~/queries/meme'

const QUERY_DEBOUNCE_WAIT = 300
const SEARCH_RESULTS_LIMIT = 8

const SECTION_HEADING_CLASS = 'text-sm font-medium text-muted-foreground'

const SWIPE_BLUR_THRESHOLD_PX = 10

const searchDrawerHandle = DrawerPrimitive.createHandle()

const closeSearchDrawer = () => {
  searchDrawerHandle.close()
}

const AiSearchLink = () => {
  return (
    <Link
      to="/memes/ai-search"
      onClick={closeSearchDrawer}
      className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
    >
      <Sparkles className="text-amber-500" aria-hidden="true" />
      {m.search_ask_ai()}
    </Link>
  )
}

const SearchSuggestions = () => {
  const categoriesQuery = useQuery(listCategoriesQueryOpts(getLocale()))
  const categories = [
    ...getVirtualCategories(),
    ...(categoriesQuery.data ?? [])
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className={SECTION_HEADING_CLASS}>
          {m.search_browse_categories()}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => {
            return (
              <li key={category.id}>
                <Link
                  to="/memes/category/$slug"
                  params={{ slug: category.slug }}
                  onClick={closeSearchDrawer}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {category.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      <AiSearchLink />
    </div>
  )
}

type SearchResultRowProps = {
  meme: MemeWithHighlight
  onSelect: () => void
}

const SearchResultRow = ({ meme, onSelect }: SearchResultRowProps) => {
  return (
    <Link
      to="/memes/$memeId"
      params={{ memeId: meme.id }}
      onClick={() => {
        onSelect()
        closeSearchDrawer()
      }}
      className="flex min-h-14 items-center gap-3 rounded-lg p-1.5 touch-tap active:bg-muted"
    >
      <img
        src={buildVideoImageUrl(meme.video.bunnyId)}
        alt=""
        width={96}
        height={54}
        loading="lazy"
        decoding="async"
        className="aspect-video w-24 shrink-0 rounded-md bg-muted object-cover"
      />
      <span className="line-clamp-2 text-sm font-medium">
        <MemeHighlightedTitle
          title={meme.title}
          highlightedTitle={meme.highlightedTitle}
        />
      </span>
    </Link>
  )
}

type SearchResultsProps = {
  query: string
}

const SearchResults = ({ query }: SearchResultsProps) => {
  const { user } = useRouteContext({ from: '__root__' })
  const resultsQuery = useQuery({
    ...listMemesQueryOpts({ query }),
    placeholderData: keepPreviousData
  })

  if (resultsQuery.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 py-10">
        <p className="text-center text-sm text-muted-foreground">
          {m.error_search_timeout()}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void resultsQuery.refetch()
          }}
        >
          <RefreshCw aria-hidden="true" />
          {m.common_retry()}
        </Button>
      </div>
    )
  }

  if (!resultsQuery.data) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    )
  }

  if (resultsQuery.data.memes.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-6">
        <p className="text-center text-sm text-muted-foreground">
          {m.search_no_results({ query })}
        </p>
        <AiSearchLink />
      </div>
    )
  }

  return (
    <div
      aria-busy={resultsQuery.isPlaceholderData}
      className="flex flex-col gap-4 transition-opacity duration-150 aria-busy:opacity-60"
    >
      <ul className="flex flex-col" aria-label={m.meme_list_label()}>
        {resultsQuery.data.memes
          .slice(0, SEARCH_RESULTS_LIMIT)
          .map((meme, index) => {
            return (
              <li key={meme.id}>
                <SearchResultRow
                  meme={meme}
                  onSelect={() => {
                    sendClickEvent({
                      queryID: resultsQuery.data.queryID,
                      objectID: meme.id,
                      position: index + 1,
                      authenticatedUserToken: user?.id
                    })
                  }}
                />
              </li>
            )
          })}
      </ul>
      <Link
        to="/memes/category/$slug"
        params={{ slug: ALL_CATEGORY_SLUG }}
        search={{ query }}
        onClick={closeSearchDrawer}
        className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}
      >
        {m.search_see_all_results()}
      </Link>
    </div>
  )
}

export const SearchDrawer = () => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')

  const debouncedSetQuery = useDebouncedCallback(
    (value: string) => {
      setQuery(value.trim())
    },
    { wait: QUERY_DEBOUNCE_WAIT }
  )

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submittedQuery = inputRef.current?.value.trim() ?? ''

    closeSearchDrawer()
    void navigate({
      to: '/memes/category/$slug',
      params: { slug: ALL_CATEGORY_SLUG },
      search: { query: submittedQuery === '' ? undefined : submittedQuery }
    })
  }

  const blurSearchWhenSwiped = (popup: HTMLDivElement | null) => {
    if (!popup) {
      return () => {}
    }

    const swipeObserver = new MutationObserver(() => {
      const swipeMovement = Number.parseFloat(
        popup.style.getPropertyValue('--drawer-swipe-movement-y')
      )

      if (swipeMovement > SWIPE_BLUR_THRESHOLD_PX) {
        inputRef.current?.blur()
      }
    })

    swipeObserver.observe(popup, {
      attributes: true,
      attributeFilter: ['style']
    })

    return () => {
      swipeObserver.disconnect()
    }
  }

  return (
    <Drawer
      handle={searchDrawerHandle}
      showSwipeHandle
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) {
          inputRef.current?.focus()
        }
      }}
    >
      <DrawerTrigger className={TAB_ITEM_CLASS}>
        <Search aria-hidden="true" />
        {m.nav_search()}
      </DrawerTrigger>
      <DrawerPrimitive.VirtualKeyboardProvider>
        <DrawerContent
          initialFocus={false}
          className="h-[calc(100dvh-6rem)]"
          ref={blurSearchWhenSwiped}
        >
          <DrawerTitle className="sr-only">{m.nav_search()}</DrawerTitle>
          <search className="shrink-0 px-4 pt-2 pb-3">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  ref={inputRef}
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  defaultValue={query}
                  placeholder={m.search_placeholder()}
                  aria-label={m.nav_search()}
                  onChange={(event) => {
                    debouncedSetQuery(event.target.value)
                  }}
                  className="h-11 rounded-full pl-9"
                />
              </div>
              <DrawerClose render={<Button variant="ghost" />}>
                {m.common_cancel()}
              </DrawerClose>
            </form>
          </search>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px)+var(--drawer-keyboard-inset,0px))]">
            {query === '' ? (
              <SearchSuggestions />
            ) : (
              <SearchResults query={query} />
            )}
          </div>
        </DrawerContent>
      </DrawerPrimitive.VirtualKeyboardProvider>
    </Drawer>
  )
}
