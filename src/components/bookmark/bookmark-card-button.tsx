import { BookmarkStar } from '~/components/bookmark/bookmark-star'
import { useBookmark } from '~/components/bookmark/use-bookmark'
import type { Meme } from '~/db/generated/prisma/client'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

type BookmarkCardButtonProps = {
  memeId: Meme['id']
  title: string
  queryID?: string
  authenticatedUserToken?: string
  className?: string
}

export const BookmarkCardButton = ({
  memeId,
  title,
  queryID,
  authenticatedUserToken,
  className
}: BookmarkCardButtonProps) => {
  const bookmark = useBookmark({ memeId, queryID, authenticatedUserToken })

  return (
    <button
      type="button"
      aria-label={m.bookmark_card_label({ title })}
      aria-pressed={bookmark.isBookmarked}
      data-active={bookmark.isBookmarked || undefined}
      className={cn(
        'grid size-8 touch-manipulation place-items-center rounded-full bg-shade-strong text-white transition-[opacity,scale] duration-(--duration-fast) ease-out after:absolute after:-inset-1.5 focus-visible:focus-ring press motion-reduce:transition-none mouse:hover:bg-shade [&>span]:size-4.5 [&>span_svg]:size-4.5',
        className
      )}
      onClick={() => {
        bookmark.toggle()
      }}
    >
      <BookmarkStar isActive={bookmark.isBookmarked} />
    </button>
  )
}
