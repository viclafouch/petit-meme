import { useMediaQuery } from '~/hooks/use-media-query'

export const useIsCoarsePointer = () => {
  return useMediaQuery('(pointer: coarse)')
}
