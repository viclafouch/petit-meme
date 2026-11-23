import type React from 'react'
import { Star } from 'lucide-react'
import { IconButtonStars } from '~/components/animate-ui/buttons/icon-button-stars'
import { useBookmark } from '~/components/bookmark/use-bookmark'
import type { MemeWithVideo } from '~/constants/meme'
import { m } from '~/paraglide/messages'

type ToggleBookmarkButtonProps = {
  meme: MemeWithVideo
} & Partial<React.ComponentProps<typeof IconButtonStars>>

export const ToggleBookmarkButton = ({
  meme,
  ...restProps
}: ToggleBookmarkButtonProps) => {
  const bookmark = useBookmark({ memeId: meme.id })

  return (
    <IconButtonStars
      {...restProps}
      active={bookmark.isBookmarked}
      onClick={(event) => {
        event.preventDefault()
        bookmark.toggle()
      }}
      aria-label={m.meme_add_bookmark()}
      aria-pressed={bookmark.isBookmarked}
    >
      <Star />
    </IconButtonStars>
  )
}
