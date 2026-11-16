import { useLocation } from '@tanstack/react-router'

const SEEN_MEMES_LIMIT = 60

export const readSeenMemeIds = (state: object) => {
  if (!('seenMemeIds' in state) || !Array.isArray(state.seenMemeIds)) {
    return []
  }

  return state.seenMemeIds.filter((seenMemeId) => {
    return typeof seenMemeId === 'string'
  })
}

export const useSeenMemeIds = () => {
  return useLocation({
    select: (location) => {
      return readSeenMemeIds(location.state)
    }
  })
}

export const appendSeenMemeId = (seenMemeIds: string[], memeId: string) => {
  return [
    ...seenMemeIds.filter((seenMemeId) => {
      return seenMemeId !== memeId
    }),
    memeId
  ].slice(-SEEN_MEMES_LIMIT)
}

export const orderUnseenFirst = <TMeme extends { id: string }>(
  memes: TMeme[],
  seenMemeIds: string[]
) => {
  const seen = new Set(seenMemeIds)

  return [
    ...memes.filter((meme) => {
      return !seen.has(meme.id)
    }),
    ...memes.filter((meme) => {
      return seen.has(meme.id)
    })
  ]
}
