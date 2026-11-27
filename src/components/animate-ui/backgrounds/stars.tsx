import type React from 'react'
import { useScroll, useTransform } from 'motion/react'
import * as motion from 'motion/react-m'
import { useIsLargeScreen } from '~/hooks/use-is-large-screen'
import { useNeedsCssFallback } from '~/hooks/use-needs-css-fallback'
import { useNeedsScrollFadeFallback } from '~/hooks/use-scroll-fade'
import { cn } from '~/lib/utils'
import starsCss from './stars.css?url'

const RANDOM_SUPPORT = '(top: random(0px, 1px))'

const STAR_COUNTS = {
  far: 48,
  small: 160,
  medium: 64,
  large: 32
} as const

type StarLayer = keyof typeof STAR_COUNTS

const VIEWPORT_UNITS = 100

const DRIFT_FADE_START_IN_VIEWPORTS = 0.5

const DRIFT_FADE_END_IN_VIEWPORTS = 2

const randomStarShadows = (count: number) => {
  return Array.from({ length: count }, () => {
    const left = (Math.random() * VIEWPORT_UNITS).toFixed(2)
    const top = (Math.random() * VIEWPORT_UNITS).toFixed(2)

    return `${left}vw ${top}vh`
  }).join(', ')
}

let fallbackStarShadows: Record<StarLayer, string> | null = null

const getFallbackStarShadows = () => {
  fallbackStarShadows ??= {
    far: randomStarShadows(STAR_COUNTS.far),
    small: randomStarShadows(STAR_COUNTS.small),
    medium: randomStarShadows(STAR_COUNTS.medium),
    large: randomStarShadows(STAR_COUNTS.large)
  }

  return fallbackStarShadows
}

const toDriftOpacity = (scrollY: number) => {
  const depthInViewports = scrollY / window.innerHeight
  const fadeProgress =
    (depthInViewports - DRIFT_FADE_START_IN_VIEWPORTS) /
    (DRIFT_FADE_END_IN_VIEWPORTS - DRIFT_FADE_START_IN_VIEWPORTS)

  return 1 - Math.min(Math.max(fadeProgress, 0), 1)
}

const DriftScrollFadeFallback = ({ children }: React.PropsWithChildren) => {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, toDriftOpacity)

  return (
    <motion.div className="stars-drift" style={{ opacity }}>
      {children}
    </motion.div>
  )
}

const Drift = ({ children }: React.PropsWithChildren) => {
  const needsScrollFadeFallback = useNeedsScrollFadeFallback()
  const isLargeScreen = useIsLargeScreen()

  if (needsScrollFadeFallback && isLargeScreen) {
    return <DriftScrollFadeFallback>{children}</DriftScrollFadeFallback>
  }

  return <div className="stars-drift">{children}</div>
}

export const StarsBackground = ({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>) => {
  const needsRandomFallback = useNeedsCssFallback(RANDOM_SUPPORT)
  const fallbackShadows = needsRandomFallback ? getFallbackStarShadows() : null

  const dotsStyle = (layer: StarLayer) => {
    return fallbackShadows
      ? { '--stars-fallback': fallbackShadows[layer] }
      : undefined
  }

  return (
    <div
      data-slot="stars-background"
      className={cn(
        'relative size-full overflow-clip dark:bg-[radial-gradient(ellipse_at_bottom,#141414_0%,#000_100%)] bg-white',
        className
      )}
      {...props}
    >
      <link rel="stylesheet" href={starsCss} precedence="default" />
      <div className="stars hidden lg:dark:block" aria-hidden="true">
        <div className="stars-dots stars-far" style={dotsStyle('far')} />
        <Drift>
          <div
            className="stars-dots stars-layer stars-layer-small"
            style={dotsStyle('small')}
          />
          <div
            className="stars-dots stars-layer stars-layer-medium"
            style={dotsStyle('medium')}
          />
          <div
            className="stars-dots stars-layer stars-layer-large"
            style={dotsStyle('large')}
          />
          <div className="stars-meteor stars-meteor-early" />
          <div className="stars-meteor stars-meteor-late" />
        </Drift>
      </div>
      <div className="stars-aurora hidden lg:dark:block" aria-hidden="true" />
      {children}
    </div>
  )
}
