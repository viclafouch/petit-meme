import {
  CATEGORY_EMOJI_PATH,
  CATEGORY_FALLBACK_EMOJI,
  matchIsCategoryEmoji
} from '~/constants/category'
import { cn } from '~/lib/utils'

type CategoryEmojiImageProps = {
  emoji: string | null
  className?: string
}

export const CategoryEmojiImage = ({
  emoji,
  className
}: CategoryEmojiImageProps) => {
  const fileName = matchIsCategoryEmoji(emoji) ? emoji : CATEGORY_FALLBACK_EMOJI

  return (
    <img
      src={`${CATEGORY_EMOJI_PATH}/${fileName}.webp`}
      alt=""
      aria-hidden="true"
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      className={cn('shrink-0 select-none', className)}
      draggable={false}
    />
  )
}
