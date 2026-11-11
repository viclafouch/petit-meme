import React from 'react'
import { Share2 } from 'lucide-react'
import { IconButtonStars } from '~/components/animate-ui/buttons/icon-button-stars'
import { MemeExportMenu } from '~/components/meme/meme-export-menu'
import { useMemeExport } from '~/components/meme/use-meme-export'
import type { MemeWithVideo } from '~/constants/meme'
import { m } from '~/paraglide/messages'

type ShareMemeButtonProps = {
  meme: MemeWithVideo
} & Partial<React.ComponentProps<typeof IconButtonStars>>

export const ShareMemeButton = ({
  meme,
  ...restProps
}: ShareMemeButtonProps) => {
  const shareMutation = useMemeExport({ mode: 'share' })

  return (
    <MemeExportMenu
      align="end"
      onExport={(format) => {
        shareMutation.trigger(meme, format)
      }}
      render={
        <IconButtonStars
          active={shareMutation.isPending}
          aria-label={m.meme_share()}
          {...restProps}
        />
      }
    >
      <Share2 />
    </MemeExportMenu>
  )
}
