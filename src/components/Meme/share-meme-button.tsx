import React from 'react'
import { Share2 } from 'lucide-react'
import { IconButtonStars } from '~/components/animate-ui/buttons/icon-button-stars'
import type { MemeWithVideo } from '~/constants/meme'
import { useMemeExport } from '~/hooks/use-meme-export'
import { m } from '~/paraglide/messages.js'

type ShareMemeButtonProps = {
  meme: MemeWithVideo
} & Partial<React.ComponentProps<typeof IconButtonStars>>

export const ShareMemeButton = ({
  meme,
  ...restProps
}: ShareMemeButtonProps) => {
  const shareMutation = useMemeExport({ mode: 'share' })

  const handleShare = () => {
    if (shareMutation.isPending) {
      return
    }

    shareMutation.trigger(meme)
  }

  return (
    <IconButtonStars
      active={shareMutation.isPending}
      onClick={handleShare}
      aria-label={m.meme_share()}
      {...restProps}
    >
      <Share2 />
    </IconButtonStars>
  )
}
