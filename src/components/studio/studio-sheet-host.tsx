import React from 'react'
import {
  useCloseStudio,
  useStudioSheetMeme
} from '~/components/studio/use-studio-history'

const LazyStudioSheet = React.lazy(async () => {
  const { StudioSheet } = await import('~/components/studio/studio-sheet')

  return { default: StudioSheet }
})

export const StudioSheetHost = () => {
  const meme = useStudioSheetMeme()
  const closeStudio = useCloseStudio()

  if (meme === null) {
    return null
  }

  return (
    <React.Suspense fallback={null}>
      <LazyStudioSheet key={meme.id} meme={meme} onClose={closeStudio} />
    </React.Suspense>
  )
}
