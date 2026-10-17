import React from 'react'
import type { User } from 'better-auth'
import { Star } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { IconButtonStars } from '~/components/animate-ui/buttons/icon-button-stars'
import type { MemeWithVideo } from '~/constants/meme'
import { useShowDialog } from '~/hooks/use-show-dialog'
import { useToggleBookmark } from '~/hooks/use-toggle-bookmark'
import { getFavoritesMemesQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages.js'

type ToggleLikeButtonProps = {
  meme: MemeWithVideo
} & Partial<React.ComponentProps<typeof IconButtonStars>>

type AuthBookmarkButtonProps = {
  user: User
} & ToggleLikeButtonProps

const AuthBookmarkButton = ({
  user,
  meme,
  ...restProps
}: AuthBookmarkButtonProps) => {
  const favoritesMemesQuery = useSuspenseQuery(getFavoritesMemesQueryOpts())

  const { isMemeBookmarked, toggleBookmark } = useToggleBookmark({
    meme,
    bookmarks: favoritesMemesQuery.data.bookmarks
  })

  const handleToggleLike = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    toggleBookmark()
  }

  return (
    <IconButtonStars
      {...restProps}
      active={isMemeBookmarked}
      onClick={handleToggleLike}
      aria-label={
        isMemeBookmarked ? m.meme_remove_favorite() : m.meme_add_favorite()
      }
    >
      <Star />
    </IconButtonStars>
  )
}

const ToggleLikeButton = ({ meme, ...restProps }: ToggleLikeButtonProps) => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()

  if (!user) {
    return (
      <IconButtonStars
        active={false}
        {...restProps}
        onClick={(event) => {
          event.preventDefault()
          showDialog('auth', {})
        }}
        aria-label={m.meme_add_favorite()}
      >
        <Star />
      </IconButtonStars>
    )
  }

  return (
    <React.Suspense fallback={<div />}>
      <AuthBookmarkButton user={user} meme={meme} {...restProps} />
    </React.Suspense>
  )
}

export { ToggleLikeButton }
