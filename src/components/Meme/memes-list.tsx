import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { AnimatePresence } from 'motion/react'
import { useRouteContext } from '@tanstack/react-router'
import { MemeListItem } from '~/components/Meme/meme-list-item'
import type { MemeListItemParams } from '~/components/Meme/meme-list-item'
import { PlayerDialog } from '~/components/Meme/player-dialog'
import { MEMES_PER_PAGE } from '~/constants/meme'
import type { MemeWithVideo } from '~/constants/meme'
import { sendViewEvent } from '~/lib/algolia-insights'
import * as m from '~/paraglide/messages'

type MemeWithHighlight = MemeWithVideo & {
  highlightedTitle?: string
}

type MemesListParams = {
  memes: MemeWithHighlight[]
  layoutContext: string
  columnGridCount?: number
  queryID?: string
  page?: number
}

export const MemesList = ({
  memes,
  layoutContext,
  columnGridCount = 4,
  queryID,
  page = 0
}: MemesListParams) => {
  const { user } = useRouteContext({ from: '__root__' })
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  const authenticatedUserToken = user?.id

  const memeIds = memes.map((meme) => {
    return meme.id
  })

  const memeIdsKey = memeIds.join(',')

  React.useEffect(() => {
    if (memeIds.length === 0) {
      return () => {}
    }

    sendViewEvent({ objectIDs: memeIds, authenticatedUserToken })

    return () => {}
    // oxlint-disable-next-line react/exhaustive-deps
  }, [memeIdsKey, authenticatedUserToken])

  useHotkeys(
    'escape',
    () => {
      return setSelectedId(null)
    },
    {
      enabled: selectedId !== null
    },
    [selectedId]
  )

  React.useEffect(() => {
    if (!selectedId) {
      return () => {}
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'escapeKey') {
        setSelectedId(null)
      }
    }

    window.addEventListener('message', handleMessage, false)

    return () => {
      window.removeEventListener('message', handleMessage, false)
    }
  }, [selectedId])

  if (memes.length === 0) {
    return <p className="text-muted-foreground">{m.common_no_results()}</p>
  }

  const handleSelect = (meme: MemeWithVideo, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger
    setSelectedId(meme.id)
  }

  const handleDeselect = () => {
    setSelectedId(null)
    triggerRef.current?.focus()
    triggerRef.current = null
  }

  const selectedMeme = memes.find((meme) => {
    return meme.id === selectedId
  })

  const size: MemeListItemParams['size'] = columnGridCount < 5 ? 'md' : 'sm'

  return (
    <div className="w-full">
      <div
        style={
          {
            '--cols': `repeat(${columnGridCount}, 1fr)`
          } as React.CSSProperties
        }
        className="grid gap-5 grid-cols-2 lg:grid-cols-(--cols)"
      >
        {memes.map((meme, index) => {
          return (
            <MemeListItem
              onPlayClick={handleSelect}
              key={meme.id}
              size={size}
              layoutContext={layoutContext}
              meme={meme}
              highlightedTitle={meme.highlightedTitle}
              queryID={queryID}
              position={page * MEMES_PER_PAGE + index + 1}
              authenticatedUserToken={authenticatedUserToken}
            />
          )
        })}
      </div>
      <AnimatePresence>
        {selectedMeme ? (
          <PlayerDialog
            meme={selectedMeme}
            layoutContext={layoutContext}
            onClose={handleDeselect}
            queryID={queryID}
            authenticatedUserToken={authenticatedUserToken}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
