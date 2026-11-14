import React from 'react'
import { useRouteContext } from '@tanstack/react-router'
import {
  MemeListItem,
  type MemeListItemProps
} from '~/components/meme/meme-list-item'
import { PlayerDialog } from '~/components/meme/player-dialog'
import {
  MEME_GRID_COLUMNS,
  MEMES_PER_PAGE,
  type MemeWithVideo
} from '~/constants/meme'
import { sendViewEvent } from '~/lib/algolia-insights'
import { m } from '~/paraglide/messages'

export type MemeWithHighlight = MemeWithVideo & {
  highlightedTitle?: string
}

type MemesListProps = {
  memes: MemeWithHighlight[]
  columnGridCount?: number
  queryID?: string
  page?: number
}

const MEME_IDS_KEY_SEPARATOR = ','

export const MemesList = ({
  memes,
  columnGridCount = 4,
  queryID,
  page = 0
}: MemesListProps) => {
  const { user } = useRouteContext({ from: '__root__' })
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)

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

  const handleSelect = (meme: MemeWithVideo, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setSelectedId(meme.id)
  }

  const handleDeselect = () => {
    triggerRef.current?.focus()
    triggerRef.current = null
    setSelectedId(null)
  }

  const selectedMeme = memes.find((meme) => {
    return meme.id === selectedId
  })

  const size: MemeListItemProps['size'] =
    columnGridCount < MEME_GRID_COLUMNS.MEDIUM ? 'md' : 'sm'

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
              onOpenPlayer={handleSelect}
              key={meme.id}
              size={size}
              meme={meme}
              highlightedTitle={meme.highlightedTitle}
              queryID={queryID}
              position={page * MEMES_PER_PAGE + index + 1}
              authenticatedUserToken={authenticatedUserToken}
            />
          )
        })}
      </ul>
      {selectedMeme ? (
        <PlayerDialog
          meme={selectedMeme}
          onClose={handleDeselect}
          queryID={queryID}
          authenticatedUserToken={authenticatedUserToken}
        />
      ) : null}
    </div>
  )
}
