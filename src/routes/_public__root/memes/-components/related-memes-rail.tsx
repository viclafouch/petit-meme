import React from 'react'
import { Shuffle } from 'lucide-react'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import {
  getRouteApi,
  Link,
  useNavigate,
  useRouteContext,
  type HistoryState
} from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { formatClockDuration } from '~/helpers/duration'
import { formatCount } from '~/helpers/number'
import { useIsCoarsePointer } from '~/hooks/use-is-coarse-pointer'
import { sendClickEvent, sendViewEvent } from '~/lib/algolia-insights'
import {
  buildVideoImageUrl,
  buildVideoPreviewUrl
} from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { listRelatedMemesQueryOpts } from '~/queries/meme'
import {
  applyBreakUiRelatedMemes,
  useBreakUiDataset
} from '~/routes/_public__root/memes/-lib/break-ui-fixtures'
import { getCategoryHue } from '~/routes/_public__root/memes/-lib/category-hue'
import {
  appendSeenMemeId,
  orderUnseenFirst,
  useSeenMemeIds
} from '~/routes/_public__root/memes/-lib/seen-memes'
import type { listRelatedMemes } from '~/server/meme/meme-list.functions'
import { getRandomMeme } from '~/server/meme/meme.functions'

const SKELETON_ITEM_COUNT = 6

const memeRouteApi = getRouteApi('/_public__root/memes/$memeId')

type RelatedMeme = Awaited<ReturnType<typeof listRelatedMemes>>[number]

const useNextSeenState = (memeId: string) => {
  const seenMemeIds = useSeenMemeIds()

  return (previousState: HistoryState) => {
    const nextState = {
      ...previousState,
      seenMemeIds: appendSeenMemeId(seenMemeIds, memeId)
    }

    return nextState
  }
}

type RelatedThumbProps = {
  meme: RelatedMeme
}

const RelatedThumb = ({ meme }: RelatedThumbProps) => {
  return (
    <span className="meme-thumb">
      <img
        src={buildVideoImageUrl(meme.video.bunnyId)}
        alt=""
        loading="lazy"
        fetchPriority="low"
        decoding="async"
        className="meme-thumb-fill"
      />
      <img
        src={buildVideoImageUrl(meme.video.bunnyId)}
        alt=""
        loading="lazy"
        fetchPriority="low"
        decoding="async"
        className="meme-thumb-image"
      />
      <img
        src={buildVideoPreviewUrl(meme.video.bunnyId)}
        alt=""
        loading="lazy"
        decoding="async"
        className="meme-thumb-preview"
      />
      <Badge
        size="sm"
        variant="black"
        className="absolute right-1.5 bottom-1.5"
      >
        {formatClockDuration(meme.video.duration, getLocale())}
      </Badge>
    </span>
  )
}

type RelatedMemeItemProps = {
  meme: RelatedMeme
  position: number
  nextSeenState: (previousState: HistoryState) => HistoryState
  isPreloaded: boolean
}

const RelatedMemeItem = ({
  meme,
  position,
  nextSeenState,
  isPreloaded
}: RelatedMemeItemProps) => {
  const { user } = useRouteContext({ from: '__root__' })
  const [categoryTitle] = meme.categoryTitles
  const [categorySlug] = meme.categorySlugs

  const handleClick = () => {
    sendClickEvent({
      objectID: meme.id,
      position,
      authenticatedUserToken: user?.id
    })
  }

  return (
    <li>
      <Link
        to="/memes/$memeId"
        params={{ memeId: meme.id }}
        state={nextSeenState}
        preload={isPreloaded ? 'intent' : false}
        className="meme-rail-item"
        onClick={handleClick}
      >
        <RelatedThumb meme={meme} />
        <span className="flex min-w-0 flex-col gap-1 py-0.5">
          <span className="line-clamp-2 text-sm leading-snug font-semibold wrap-anywhere">
            {meme.title}
          </span>
          {categoryTitle && categorySlug ? (
            <span
              className="meme-rail-category"
              style={{ '--hue': getCategoryHue(categorySlug) }}
              title={categoryTitle}
            >
              <span className="truncate">{categoryTitle}</span>
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {m.meme_views({
              count: meme.viewCount,
              formattedCount: formatCount(
                meme.viewCount,
                getLocale(),
                'compact'
              )
            })}
          </span>
        </span>
      </Link>
    </li>
  )
}

type RelatedMemesListProps = {
  memeId: string
  title: string
}

const RelatedMemesList = ({ memeId, title }: RelatedMemesListProps) => {
  const { user } = useRouteContext({ from: '__root__' })
  const relatedMemesQuery = useSuspenseQuery(
    listRelatedMemesQueryOpts({ memeId, title })
  )
  const seenMemeIds = memeRouteApi.useLoaderData({
    select: (loaderData) => {
      return loaderData.seenMemeIds
    }
  })
  const isCoarsePointer = useIsCoarsePointer()
  const nextSeenState = useNextSeenState(memeId)
  const breakUiDataset = useBreakUiDataset()
  const relatedMemes = orderUnseenFirst(
    applyBreakUiRelatedMemes(relatedMemesQuery.data, breakUiDataset).filter(
      (relatedMeme) => {
        return relatedMeme.id !== memeId
      }
    ),
    seenMemeIds
  )
  const relatedMemeIdsKey = relatedMemes
    .map((relatedMeme) => {
      return relatedMeme.id
    })
    .join(',')

  React.useEffect(() => {
    if (relatedMemeIdsKey === '') {
      return
    }

    sendViewEvent({
      objectIDs: relatedMemeIdsKey.split(','),
      authenticatedUserToken: user?.id
    })
  }, [relatedMemeIdsKey, user?.id])

  if (relatedMemes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{m.meme_related_empty()}</p>
    )
  }

  return (
    <ul className="meme-rail-list" aria-labelledby="meme-related-heading">
      {relatedMemes.map((relatedMeme, index) => {
        return (
          <RelatedMemeItem
            key={relatedMeme.id}
            meme={relatedMeme}
            position={index + 1}
            nextSeenState={nextSeenState}
            isPreloaded={!isCoarsePointer}
          />
        )
      })}
    </ul>
  )
}

const RelatedMemesSkeleton = () => {
  return (
    <ul className="meme-rail-list" aria-hidden="true">
      {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => {
        return (
          <li key={index} className="meme-rail-item">
            <Skeleton className="aspect-video rounded-[0.625rem]" />
            <span className="flex flex-col gap-2 py-0.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

type RandomMemeButtonProps = {
  memeId: string
}

const RandomMemeButton = ({ memeId }: RandomMemeButtonProps) => {
  const navigate = useNavigate()
  const nextSeenState = useNextSeenState(memeId)
  const randomMemeMutation = useMutation({
    mutationFn: () => {
      return getRandomMeme({ data: { exceptId: memeId } })
    },
    onSuccess: (randomMeme) => {
      if (randomMeme) {
        void navigate({
          to: '/memes/$memeId',
          params: { memeId: randomMeme.id },
          state: nextSeenState
        })
      } else {
        void navigate({ to: '/memes' })
      }
    }
  })

  const handleClick = () => {
    randomMemeMutation.mutate()
  }

  return (
    <button
      type="button"
      className="pill"
      disabled={randomMemeMutation.isPending}
      onClick={handleClick}
    >
      <Shuffle aria-hidden="true" className="size-4" />
      {m.meme_shuffle()}
    </button>
  )
}

type RelatedMemesRailProps = {
  memeId: string
  title: string
}

export const RelatedMemesRail = ({ memeId, title }: RelatedMemesRailProps) => {
  return (
    <aside
      aria-labelledby="meme-related-heading"
      className="meme-rail mt-8 px-4 lg:mt-0 lg:px-0"
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 id="meme-related-heading" className="text-base font-semibold">
          {m.meme_related()}
        </h2>
        <RandomMemeButton memeId={memeId} />
      </div>
      <React.Suspense fallback={<RelatedMemesSkeleton />}>
        <RelatedMemesList memeId={memeId} title={title} />
      </React.Suspense>
    </aside>
  )
}
