import { describe, expect, it } from 'vitest'
import { getNextTabBarScroll } from '~/helpers/tab-bar'

const BAR_HEIGHT = 64
const MAX_SCROLL_Y = 2000
const BOUNCE_DISTANCE = 40

describe('getNextTabBarScroll', () => {
  it('should hide the bar while the page scrolls down past its height', () => {
    expect(
      getNextTabBarScroll({
        previous: { scrollY: 100, isHidden: false },
        scrollY: 140,
        maxScrollY: MAX_SCROLL_Y,
        barHeight: BAR_HEIGHT
      })
    ).toStrictEqual({ scrollY: 140, isHidden: true })
  })

  it('should bring the bar back as soon as the page scrolls up', () => {
    expect(
      getNextTabBarScroll({
        previous: { scrollY: 800, isHidden: true },
        scrollY: 790,
        maxScrollY: MAX_SCROLL_Y,
        barHeight: BAR_HEIGHT
      })
    ).toStrictEqual({ scrollY: 790, isHidden: false })
  })

  it('should keep the bar hidden while the page bounces past its bottom', () => {
    expect(
      getNextTabBarScroll({
        previous: { scrollY: MAX_SCROLL_Y, isHidden: true },
        scrollY: MAX_SCROLL_Y + BOUNCE_DISTANCE,
        maxScrollY: MAX_SCROLL_Y,
        barHeight: BAR_HEIGHT
      })
    ).toStrictEqual({ scrollY: MAX_SCROLL_Y, isHidden: true })
  })

  it('should ignore the bounce past the top of the page', () => {
    expect(
      getNextTabBarScroll({
        previous: { scrollY: 0, isHidden: false },
        scrollY: -BOUNCE_DISTANCE,
        maxScrollY: MAX_SCROLL_Y,
        barHeight: BAR_HEIGHT
      })
    ).toStrictEqual({ scrollY: 0, isHidden: false })
  })

  it('should keep the bar visible near the top of the page', () => {
    expect(
      getNextTabBarScroll({
        previous: { scrollY: 10, isHidden: false },
        scrollY: BAR_HEIGHT,
        maxScrollY: MAX_SCROLL_Y,
        barHeight: BAR_HEIGHT
      })
    ).toStrictEqual({ scrollY: BAR_HEIGHT, isHidden: false })
  })
})
