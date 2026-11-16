import React from 'react'
import { useRouteContext } from '@tanstack/react-router'
import {
  MemeListItem,
  type MemeListItemProps
} from '~/components/meme/meme-list-item'
import type { ThumbnailPriority } from '~/components/meme/meme-video-thumbnail'
import {
  MEME_GRID_COLUMNS,
  MEMES_PER_PAGE,
  type MemeWithVideo
} from '~/constants/meme'
import type { HighlightedText } from '~/helpers/highlight'
import { sendViewEvent } from '~/lib/algolia-insights'
import { m } from '~/paraglide/messages'

export type MemeWithHighlight = MemeWithVideo & {
  highlightedTitle?: HighlightedText
}

type MemesListProps = {
  memes: MemeWithHighlight[]
  columnGridCount?: number
  queryID?: string
  page?: number
  isAboveTheFold?: boolean
}

const MEME_IDS_KEY_SEPARATOR = ','

export const MemesList = ({
  memes,
  columnGridCount = 4,
  queryID,
  page = 0,
  isAboveTheFold = true
}: MemesListProps) => {
  const { user } = useRouteContext({ from: '__root__' })

  const authenticatedUserToken = user?.id

  const memeIdsKey = memes
    .map((meme) => {
      return meme.id
    })
    .join(MEME_IDS_KEY_SEPARATOR)

  React.useEffect(() => {
    if (memeIdsKey === '') {
      return () => {}
    }

    sendViewEvent({
      objectIDs: memeIdsKey.split(MEME_IDS_KEY_SEPARATOR),
      authenticatedUserToken
    })

    return () => {}
  }, [memeIdsKey, authenticatedUserToken])

  if (memes.length === 0) {
    return <p className="text-muted-foreground">{m.common_no_results()}</p>
  }

  const size: MemeListItemProps['size'] =
    columnGridCount < MEME_GRID_COLUMNS.MEDIUM ? 'md' : 'sm'

  const getThumbnailPriority = (index: number): ThumbnailPriority => {
    if (!isAboveTheFold || index >= columnGridCount) {
      return 'lazy'
    }

    return index === 0 ? 'lcp' : 'eager'
  }

  return (
    <div className="w-full">
      <ul
        style={{ '--cols': `repeat(${columnGridCount}, 1fr)` }}
        className="grid gap-5 grid-cols-2 lg:grid-cols-(--cols)"
        aria-label={m.meme_list_label()}
      >
        {memes.map((meme, index) => {
          return (
            <MemeListItem
              key={meme.id}
              size={size}
              meme={meme}
              highlightedTitle={meme.highlightedTitle}
              queryID={queryID}
              position={page * MEMES_PER_PAGE + index + 1}
              authenticatedUserToken={authenticatedUserToken}
              thumbnailPriority={getThumbnailPriority(index)}
            />
          )
        })}
      </ul>
    </div>
  )
}
