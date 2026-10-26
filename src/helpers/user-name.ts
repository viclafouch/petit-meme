import { USER_NAME_MAX_LENGTH } from '~/constants/auth'

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme'
})

export const boundProviderName = (name: string) => {
  const trimmedName = name.trim()
  const lastFittingGrapheme = [
    ...graphemeSegmenter.segment(trimmedName)
  ].findLast(({ index, segment }) => {
    return index + segment.length <= USER_NAME_MAX_LENGTH
  })

  if (!lastFittingGrapheme) {
    return ''
  }

  return trimmedName.slice(
    0,
    lastFittingGrapheme.index + lastFittingGrapheme.segment.length
  )
}
