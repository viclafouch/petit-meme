import { createClientOnlyFn } from '@tanstack/react-start'
import { COARSE_POINTER_QUERY } from '~/constants/media-query'

export const matchIsCoarsePointer = createClientOnlyFn(() => {
  return window.matchMedia(COARSE_POINTER_QUERY).matches
})
