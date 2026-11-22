import React from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { sendViewEvent } from '~/lib/algolia-insights'

const EAGER_THUMBNAIL_COUNT = 10
const MEME_IDS_KEY_SEPARATOR = ','

export type ThumbnailPriority = 'lcp' | 'eager' | 'lazy'

export const toThumbnailPriority = (
  index: number,
  isAboveTheFold = true
): ThumbnailPriority => {
  if (!isAboveTheFold) {
    return 'lazy'
  }

  if (index === 0) {
    return 'lcp'
  }

  return index < EAGER_THUMBNAIL_COUNT ? 'eager' : 'lazy'
}

type MemeWithId = {
  id: string
}

export const useMemesViewEvent = (memes: MemeWithId[]) => {
  const { user } = useRouteContext({ from: '__root__' })
  const authenticatedUserToken = user?.id
  const memeIdsKey = memes
    .map((meme) => {
      return meme.id
    })
    .join(MEME_IDS_KEY_SEPARATOR)

  React.useEffect(() => {
    if (memeIdsKey === '') {
      return
    }

    sendViewEvent({
      objectIDs: memeIdsKey.split(MEME_IDS_KEY_SEPARATOR),
      authenticatedUserToken
    })
  }, [memeIdsKey, authenticatedUserToken])

  return authenticatedUserToken
}
