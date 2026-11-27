import { useNeedsCssFallback } from '~/hooks/use-needs-css-fallback'

const SCROLL_FADE_SUPPORT =
  '(animation-timeline: scroll()) and (animation-range: 0% 100%)'

export const useNeedsScrollFadeFallback = (): boolean => {
  return useNeedsCssFallback(SCROLL_FADE_SUPPORT)
}
