import React from 'react'
import { useReducedMotion } from 'motion/react'

const PAGE_SCROLL_RATIO = 0.75

const centerInScroller = (
  scroller: HTMLElement,
  item: HTMLElement,
  behavior: ScrollBehavior
) => {
  scroller.scrollTo({
    left: item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2,
    behavior
  })
}

export const useScrollerControls = (
  scrollerRef: React.RefObject<HTMLElement | null>,
  initialItemRef: React.RefObject<HTMLElement | null>
) => {
  const isReducedMotion = useReducedMotion()
  const behavior: ScrollBehavior = isReducedMotion ? 'instant' : 'smooth'

  React.useLayoutEffect(() => {
    if (scrollerRef.current && initialItemRef.current) {
      centerInScroller(scrollerRef.current, initialItemRef.current, 'instant')
    }
  }, [scrollerRef, initialItemRef])

  const scrollByPage = (direction: -1 | 1) => {
    const scroller = scrollerRef.current

    if (scroller) {
      scroller.scrollBy({
        left: direction * scroller.clientWidth * PAGE_SCROLL_RATIO,
        behavior
      })
    }
  }

  const scrollToStart = () => {
    scrollerRef.current?.scrollTo({ left: 0, behavior })
  }

  const centerItem = (item: HTMLElement) => {
    if (scrollerRef.current) {
      centerInScroller(scrollerRef.current, item, behavior)
    }
  }

  return { scrollByPage, scrollToStart, centerItem }
}
