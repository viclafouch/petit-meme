import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { useCaptionRender } from '~/components/studio/use-caption-render'
import { useStudioExport } from '~/components/studio/use-studio-export'
import {
  INITIAL_CAPTION,
  type StudioMeme,
  type Caption,
  type CaptionLookId,
  type CaptionSlot
} from '~/constants/studio'
import { bindFrenchPunctuation, moveCaptionToLook } from '~/helpers/caption'
import { getGenerationQuotaQueryOpts } from '~/queries/studio'

export const useStudio = (meme: StudioMeme) => {
  const { user } = useRouteContext({ from: '__root__' })
  const isSignedIn = Boolean(user)
  const isPremium = useIsPremium()
  const quotaQuery = useQuery({
    ...getGenerationQuotaQueryOpts(),
    enabled: isSignedIn
  })
  const isQuotaReached = quotaQuery.data?.isReached ?? null
  const [caption, setCaption] = React.useState<Caption>(INITIAL_CAPTION)
  const [isPlacementChosen, setIsPlacementChosen] = React.useState(false)
  const render = useCaptionRender({
    memeId: meme.id,
    plan: isPremium ? 'premium' : 'free',
    caption,
    isEnabled: isSignedIn && isQuotaReached === false
  })
  const exporter = useStudioExport({
    title: meme.title,
    memeId: meme.id,
    isSignedIn,
    isQuotaReached,
    render
  })

  return {
    caption,
    render,
    exporter,
    isPremium,
    setText: (slot: CaptionSlot, text: string) => {
      setCaption((previous) => {
        return { ...previous, [slot]: bindFrenchPunctuation(text) }
      })
    },
    setLook: (lookId: CaptionLookId) => {
      setCaption((previous) => {
        return isPlacementChosen
          ? { ...previous, look: lookId }
          : moveCaptionToLook(previous, lookId)
      })
    },
    choosePlacement: () => {
      setIsPlacementChosen(true)
    }
  }
}

export type Studio = ReturnType<typeof useStudio>
