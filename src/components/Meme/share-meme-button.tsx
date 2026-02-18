import React from 'react'
import { Share2 } from 'lucide-react'
import { IconButtonStars } from '@/components/animate-ui/buttons/icon-button-stars'
import { OverlaySpinner } from '@/components/ui/overlay-spinner'
import type { MemeWithVideo } from '@/constants/meme'
import { useShareMeme } from '@/hooks/use-share-meme'

type ShareMemeButtonProps = {
  meme: MemeWithVideo
} & Partial<React.ComponentProps<typeof IconButtonStars>>

export const ShareMemeButton = ({
  meme,
  ...restProps
}: ShareMemeButtonProps) => {
  const shareMutation = useShareMeme()

  const handleShare = () => {
    if (shareMutation.isPending) {
      return
    }

    shareMutation.mutate(meme)
  }

  return (
    <>
      {shareMutation.isPending ? <OverlaySpinner /> : null}
      <IconButtonStars
        active={shareMutation.isPending}
        onClick={handleShare}
        aria-label="Partager"
        {...restProps}
      >
        <Share2 />
      </IconButtonStars>
    </>
  )
}
