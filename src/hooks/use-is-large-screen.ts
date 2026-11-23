import { useMediaQuery } from '~/hooks/use-media-query'

const LARGE_SCREEN_QUERY = '(width >= 64rem)'

export const useIsLargeScreen = () => {
  return useMediaQuery(LARGE_SCREEN_QUERY)
}
