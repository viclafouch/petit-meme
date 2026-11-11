import React from 'react'
import type { User } from 'better-auth'
import { Star } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { IconButtonStars } from '~/components/animate-ui/buttons/icon-button-stars'
import { useToggleBookmark } from '~/components/meme/use-toggle-bookmark'
import type { MemeWithVideo } from '~/constants/meme'
import { m } from '~/paraglide/messages.js'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { dialogStore } from '~/stores/dialog.store'

type ToggleBookmarkButtonProps = {
  meme: MemeWithVideo
} & Partial<React.ComponentProps<typeof IconButtonStars>>

type AuthBookmarkButtonProps = {
  user: User
} & ToggleBookmarkButtonProps

const AuthBookmarkButton = ({
  user,
  meme,
  ...restProps
}: AuthBookmarkButtonProps) => {
  const bookmarkedMemesQuery = useSuspenseQuery(listBookmarkedMemesQueryOpts())

  const { isMemeBookmarked, toggleBookmark } = useToggleBookmark({
    meme,
    bookmarks: bookmarkedMemesQuery.data.bookmarks
  })

  const handleToggleBookmark = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    toggleBookmark()
  }

  return (
    <IconButtonStars
      {...restProps}
      active={isMemeBookmarked}
      onClick={handleToggleBookmark}
      aria-label={
        isMemeBookmarked ? m.meme_remove_bookmark() : m.meme_add_bookmark()
      }
    >
      <Star />
    </IconButtonStars>
  )
}

const ToggleBookmarkButton = ({
  meme,
  ...restProps
}: ToggleBookmarkButtonProps) => {
  const { user } = useRouteContext({ from: '__root__' })

  if (!user) {
    return (
      <IconButtonStars
        active={false}
        {...restProps}
        onClick={(event) => {
          event.preventDefault()
          dialogStore.actions.showDialog('auth')
        }}
        aria-label={m.meme_add_bookmark()}
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

export { ToggleBookmarkButton }
