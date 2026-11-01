import React from 'react'
import {
  getPublishRunTarget,
  pacePublishRun
} from '~/routes/admin/library/-lib/publish-run'
import type { MemePublisherRun } from './use-meme-publisher'

const STEP_REVEAL_MS = 450

export function usePacedPublishRun(run: MemePublisherRun) {
  const [revealedCount, setRevealedCount] = React.useState(0)
  const target = getPublishRunTarget(run)

  React.useEffect(() => {
    if (revealedCount >= target) {
      return
    }

    const timeoutId = setTimeout(() => {
      setRevealedCount((count) => {
        return count + 1
      })
    }, STEP_REVEAL_MS)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [revealedCount, target])

  return pacePublishRun(run, revealedCount)
}
