import React from 'react'
import { useHotkeys } from '@tanstack/react-hotkeys'
import { useDebouncedCallback } from '@tanstack/react-pacer'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { buildVideoFirstFrameUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'
import { listReelsQueryOpts } from '~/queries/meme'
import { findReelSnapshotImage } from '~/routes/reels/-lib/reel-snapshot'
import {
  matchIsDataSaverOn,
  type ReelsSound
} from '~/routes/reels/-lib/reels-playback'
import { rememberNextUnseenReel } from '~/routes/reels/-lib/reels-position'
import { Reel, type ReelLoading } from './reel'
import { ReelsTopBar } from './reels-top-bar'

const SCROLL_SETTLE_FALLBACK_MS = 150

const IS_SCROLL_END_SUPPORTED =
  typeof window !== 'undefined' && 'onscrollend' in window

const MOUNTED_REELS_BEFORE = 2

const MOUNTED_REELS_AFTER = 2

const NEXT_PAGE_DISTANCE = 6

const THUMBNAILS_BEFORE = 2

const THUMBNAILS_AFTER = 6

const FEED_HOTKEYS = [
  { hotkey: 'ArrowDown', step: 1 },
  { hotkey: 'PageDown', step: 1 },
  { hotkey: 'ArrowUp', step: -1 },
  { hotkey: 'PageUp', step: -1 }
] as const

const resumeIndexByFeed = new WeakMap<object, number>()

const findSnappedIndex = (feed: HTMLElement) => {
  return Math.round(feed.scrollTop / feed.clientHeight)
}

const findResumeIndex = (firstPage: object | undefined) => {
  return (firstPage && resumeIndexByFeed.get(firstPage)) ?? 0
}

type ResolveReelLoadingParams = {
  distance: number
  isActiveReelBuffered: boolean
}

const resolveReelLoading = ({
  distance,
  isActiveReelBuffered
}: ResolveReelLoadingParams): ReelLoading => {
  if (distance === 0) {
    return 'play'
  }

  if (distance === -1 && !matchIsDataSaverOn()) {
    return 'preload'
  }

  if (distance === 1 && isActiveReelBuffered && !matchIsDataSaverOn()) {
    return 'preload'
  }

  return 'poster'
}

export const ReelsFeed = () => {
  const reelsQuery = useSuspenseInfiniteQuery(listReelsQueryOpts())
  const [firstPage] = reelsQuery.data.pages
  const feedRef = React.useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = React.useState(() => {
    return findResumeIndex(firstPage)
  })
  const [visibleIndex, setVisibleIndex] = React.useState(activeIndex)
  const [bufferedIndex, setBufferedIndex] = React.useState<number | null>(null)
  const [sound, setSound] = React.useState<ReelsSound>('on')

  const reels = reelsQuery.data.pages.flatMap((page, pageIndex) => {
    return page.reels.map((reel, reelIndex) => {
      return {
        key: `${pageIndex}:${reel.meme.id}`,
        meme: reel.meme,
        signedStream: { url: reel.streamUrl, signedAt: page.signedAt },
        position: {
          seed: page.cursor.seed,
          offset: page.cursor.offset + reelIndex
        }
      }
    })
  })

  const hasLoadError = reelsQuery.isFetchNextPageError

  React.useLayoutEffect(() => {
    const feed = feedRef.current

    if (!feed) {
      return
    }

    feed.scrollTo({
      top: findResumeIndex(firstPage) * feed.clientHeight,
      behavior: 'instant'
    })
    feed.focus({ preventScroll: true })
  }, [firstPage])

  const fetchNextPageNear = (index: number) => {
    const isNearTheEnd = index >= reels.length - NEXT_PAGE_DISTANCE

    if (
      isNearTheEnd &&
      reelsQuery.hasNextPage &&
      !reelsQuery.isFetchingNextPage &&
      !reelsQuery.isFetchNextPageError
    ) {
      void reelsQuery.fetchNextPage()
    }
  }

  const activateSnappedReel = () => {
    const feed = feedRef.current

    if (!feed) {
      return
    }

    const index = findSnappedIndex(feed)

    setActiveIndex(index)
    setVisibleIndex(index)
    fetchNextPageNear(index)
  }

  const activateSnappedReelAfterScroll = useDebouncedCallback(
    activateSnappedReel,
    { wait: SCROLL_SETTLE_FALLBACK_MS }
  )

  const followScroll = () => {
    const feed = feedRef.current

    if (!feed) {
      return
    }

    const index = findSnappedIndex(feed)

    setVisibleIndex(index)
    fetchNextPageNear(index)

    if (!IS_SCROLL_END_SUPPORTED) {
      activateSnappedReelAfterScroll()
    }
  }

  React.useEffect(() => {
    if (firstPage) {
      resumeIndexByFeed.set(firstPage, activeIndex)
    }
  }, [firstPage, activeIndex])

  const activeSeed = reels[activeIndex]?.position.seed
  const activeOffset = reels[activeIndex]?.position.offset

  React.useEffect(() => {
    if (activeSeed !== undefined && activeOffset !== undefined) {
      rememberNextUnseenReel({ seed: activeSeed, offset: activeOffset })
    }
  }, [activeSeed, activeOffset])

  const scrollFeedBy = (step: number) => {
    const feed = feedRef.current

    if (feed) {
      feed.scrollTo({
        top: (findSnappedIndex(feed) + step) * feed.clientHeight
      })
    }
  }

  useHotkeys(
    FEED_HOTKEYS.map(({ hotkey, step }) => {
      return {
        hotkey,
        callback: (event) => {
          const feed = feedRef.current
          const isFeedFocused =
            document.activeElement === document.body ||
            Boolean(feed?.contains(document.activeElement))

          if (!isFeedFocused) {
            return
          }

          event.preventDefault()
          scrollFeedBy(step)
        },
        options: { preventDefault: false, stopPropagation: false }
      }
    })
  )

  if (reels.length === 0) {
    return (
      <p className="grid h-full place-items-center p-6 text-center text-muted-foreground">
        {m.reels_empty()}
      </p>
    )
  }

  return (
    <>
      <div
        ref={feedRef}
        role="feed"
        aria-label={m.meme_video_feed()}
        aria-busy={reelsQuery.isFetchingNextPage}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the feed is the scroll container the arrow keys move through
        tabIndex={0}
        className="reels-feed outline-none motion-safe:scroll-smooth"
        onScrollEnd={activateSnappedReel}
        onScroll={followScroll}
      >
        {reels.map((reel, index) => {
          const distance = index - activeIndex
          const visibleDistance = index - visibleIndex
          const isMounted =
            (distance >= -MOUNTED_REELS_BEFORE &&
              distance <= MOUNTED_REELS_AFTER) ||
            Math.abs(visibleDistance) <= 1
          const hasThumbnail =
            visibleDistance >= -THUMBNAILS_BEFORE &&
            visibleDistance <= THUMBNAILS_AFTER

          return (
            <div key={reel.key} className="reel-slot bg-black">
              {hasThumbnail || isMounted ? (
                <img
                  src={
                    findReelSnapshotImage(reel.meme.id) ??
                    buildVideoFirstFrameUrl(reel.meme.video.bunnyId)
                  }
                  alt=""
                  decoding="async"
                  fetchPriority={
                    Math.abs(visibleDistance) <= 1 ? 'high' : 'low'
                  }
                  className="absolute inset-0 size-full object-contain"
                />
              ) : null}
              {isMounted ? (
                <Reel
                  index={index}
                  meme={reel.meme}
                  signedStream={reel.signedStream}
                  loading={resolveReelLoading({
                    distance,
                    isActiveReelBuffered: bufferedIndex === activeIndex
                  })}
                  sound={sound}
                  onSoundChange={setSound}
                  onBuffered={setBufferedIndex}
                  isOnScreen={visibleDistance === 0}
                />
              ) : null}
            </div>
          )
        })}
        {hasLoadError ? (
          <div
            role="alert"
            className="reel-slot flex flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              {m.reels_load_error()}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                void reelsQuery.fetchNextPage()
              }}
            >
              {m.common_retry()}
            </Button>
          </div>
        ) : null}
      </div>
      <ReelsTopBar sound={sound} onSoundChange={setSound} />
    </>
  )
}
