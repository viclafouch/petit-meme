import React from 'react'
import type { User } from 'better-auth'
import { Star } from 'lucide-react'
import { IconButtonStars } from '@/components/animate-ui/buttons/icon-button-stars'
import type { MemeWithVideo } from '@/constants/meme'
import { useToggleBookmark } from '@/hooks/use-toggle-bookmark'
import { getFavoritesMemesQueryOpts } from '@/lib/queries'
import { useShowDialog } from '@/stores/dialog.store'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'

type ToggleLikeButtonProps = {
  meme: MemeWithVideo
} & Partial<React.ComponentProps<typeof IconButtonStars>>

const AuthBookmarkButton = ({
  user,
  meme,
  ...restProps
}: {
  user: User
} & ToggleLikeButtonProps) => {
  const query = useSuspenseQuery(getFavoritesMemesQueryOpts())

  const { isMemeBookmarked, toggleBookmark } = useToggleBookmark({
    meme,
    bookmarks: query.data.bookmarks
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
        isMemeBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'
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
        aria-label="Ajouter aux favoris"
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

export default ToggleLikeButton
