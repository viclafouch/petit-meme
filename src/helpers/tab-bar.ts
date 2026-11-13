export type TabBarScroll = {
  scrollY: number
  isHidden: boolean
}

type GetNextTabBarScrollParams = {
  previous: TabBarScroll
  scrollY: number
  maxScrollY: number
  barHeight: number
}

export const getNextTabBarScroll = ({
  previous,
  scrollY,
  maxScrollY,
  barHeight
}: GetNextTabBarScrollParams): TabBarScroll => {
  const boundedScrollY = Math.max(0, Math.min(scrollY, maxScrollY))

  if (boundedScrollY === previous.scrollY) {
    return previous
  }

  const isScrollingDown = boundedScrollY > previous.scrollY

  return {
    scrollY: boundedScrollY,
    isHidden: isScrollingDown && boundedScrollY > barHeight
  }
}
