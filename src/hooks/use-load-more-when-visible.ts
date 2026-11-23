import React from 'react'

const LOAD_MORE_ROOT_MARGIN = '0px 0px 50% 0px'

type UseLoadMoreWhenVisibleParams = {
  isFetching: boolean
  hasFailed: boolean
  onLoadMore: () => void
}

export const useLoadMoreWhenVisible = ({
  isFetching,
  hasFailed,
  onLoadMore
}: UseLoadMoreWhenVisibleParams) => {
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const onLoadMoreEvent = React.useEffectEvent(onLoadMore)

  React.useEffect(() => {
    const sentinel = sentinelRef.current

    if (!sentinel || isFetching || hasFailed) {
      return () => {}
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMoreEvent()
        }
      },
      { rootMargin: LOAD_MORE_ROOT_MARGIN }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [isFetching, hasFailed])

  return sentinelRef
}
