import { COARSE_POINTER_QUERY } from '~/constants/media-query'
import { useMediaQuery } from '~/hooks/use-media-query'

export const useIsCoarsePointer = () => {
  return useMediaQuery(COARSE_POINTER_QUERY)
}
