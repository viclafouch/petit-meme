import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { AnimatePresence } from 'motion/react'
import type { MemeListItemParams } from '@/components/Meme/meme-list-item'
import { MemeListItem } from '@/components/Meme/meme-list-item'
import { PlayerDialog } from '@/components/Meme/player-dialog'
import { StudioDialog } from '@/components/Meme/studio-dialog'
import { OverlaySpinner } from '@/components/ui/overlay-spinner'
import { MEMES_PER_PAGE, type MemeWithVideo } from '@/constants/meme'
import { ClientOnly } from '@tanstack/react-router'

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
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [studioMemeSelected, setStudioMemeSelected] =
    React.useState<MemeWithVideo | null>(null)

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
    return <p className="text-muted-foreground">Aucun résultat</p>
  }

  const handleSelect = (meme: MemeWithVideo) => {
    setSelectedId(meme.id)
  }

  const handleDeselect = () => {
    setSelectedId(null)
  }

  const handleCloseStudio = () => {
    setStudioMemeSelected(null)
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
              onOpenStudioClick={setStudioMemeSelected}
              queryID={queryID}
              position={page * MEMES_PER_PAGE + index + 1}
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
            onOpenStudio={setStudioMemeSelected}
          />
        ) : null}
      </AnimatePresence>
      <ClientOnly>
        {studioMemeSelected ? (
          <React.Suspense fallback={<OverlaySpinner />}>
            <StudioDialog
              meme={studioMemeSelected}
              open
              onOpenChange={handleCloseStudio}
            />
          </React.Suspense>
        ) : null}
      </ClientOnly>
    </div>
  )
}
