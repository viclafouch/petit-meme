import React from 'react'
import { getNextTabBarScroll, type TabBarScroll } from '~/helpers/tab-bar'

export const useHideOnScrollDown = (
  barRef: React.RefObject<HTMLElement | null>
) => {
  React.useEffect(() => {
    const bar = barRef.current

    if (!bar || CSS.supports('container-type', 'scroll-state')) {
      return
    }

    let tabBarScroll: TabBarScroll = {
      scrollY: window.scrollY,
      isHidden: false
    }

    const handleScroll = () => {
      const nextTabBarScroll = getNextTabBarScroll({
        previous: tabBarScroll,
        scrollY: window.scrollY,
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
        barHeight: bar.offsetHeight
      })

      if (nextTabBarScroll.isHidden !== tabBarScroll.isHidden) {
        bar.toggleAttribute('data-hidden', nextTabBarScroll.isHidden)
      }

      tabBarScroll = nextTabBarScroll
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [barRef])
}
