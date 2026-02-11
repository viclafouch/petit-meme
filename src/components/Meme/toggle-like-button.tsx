import React from 'react'
import type { User } from 'better-auth'
import { Star } from 'lucide-react'
import { IconButtonStars } from '@/components/animate-ui/buttons/icon-button-stars'
import type { MemeWithVideo } from '@/constants/meme'
import { getFavoritesMemesQueryOpts, getMemeByIdQueryOpts } from '@/lib/queries'
import { toggleBookmarkByMemeId } from '@/server/user'
import { useShowDialog } from '@/stores/dialog.store'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery
} from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  const query = useSuspenseQuery(getFavoritesMemesQueryOpts())

  // eslint-disable-next-line no-restricted-syntax
  const isMemeBookmarked = React.useMemo(() => {
    return query.data.bookmarks.some((bookmark) => {
      return bookmark.id === meme.id
    })
  }, [query.data, meme])

  const toggleLikeMutation = useMutation({
    mutationFn: toggleBookmarkByMemeId,
    onMutate: async () => {
      const newValue = !isMemeBookmarked

      await queryClient.cancelQueries({
        queryKey: getFavoritesMemesQueryOpts.all
      })

      queryClient.setQueryData(getFavoritesMemesQueryOpts().queryKey, (old) => {
        if (!old) {
          return old
        }

        if (!newValue) {
          return {
            bookmarks: old.bookmarks.filter((bookmark) => {
              return bookmark.id !== meme.id
            }),
            count: old.count - 1
          }
        }

        return {
          bookmarks: [meme, ...old.bookmarks],
          count: old.count + 1
        }
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries(getMemeByIdQueryOpts(meme.id))
      void queryClient.invalidateQueries(getFavoritesMemesQueryOpts())
    }
  })

  const handleToggleLike = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    toggleLikeMutation.mutate({
      data: meme.id
    })
  }

  return (
    <IconButtonStars
      {...restProps}
      active={isMemeBookmarked}
      onClick={handleToggleLike}
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
