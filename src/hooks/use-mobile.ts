import { useMediaQuery } from '~/hooks/use-media-query'

const MOBILE_QUERY = '(width < 48rem)'

export const useIsMobile = () => {
  return useMediaQuery(MOBILE_QUERY)
}
