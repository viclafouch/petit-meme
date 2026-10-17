import React from 'react'
import { type Variants, motion, useReducedMotion } from 'motion/react'
import { LogoCarousel } from '~/components/ui/logo-carousel'
import { logos } from '~/constants/config'

const FLOAT_MIN_DURATION = 4
const FLOAT_DURATION_SPREAD = 4
const FLOAT_HEIGHT = 20
const FLOAT_TILT_DEGREES = 10
const FLOAT_PEAK_TIME = 0.5
const LOGO_ENTRANCE_STAGGER = 0.2

const logoPositions = [
  { x: 'left-0', y: 'top-0', duration: 8000, delay: 0 },
  {
    x: '-left-30',
    y: 'top-1/3 -translate-y-1/3',
    duration: 12_000,
    delay: 2000
  },
  { x: 'left-0', y: 'bottom-0', duration: 10_500, delay: 4000 },
  { x: 'right-0', y: 'top-0', duration: 9500, delay: 1000 },
  {
    x: '-right-30',
    y: 'top-1/3 -translate-y-1/3',
    duration: 11_000,
    delay: 3000
  },
  { x: 'right-0', y: 'bottom-0', duration: 13_000, delay: 5000 }
] as const satisfies {
  x: string
  y: string
  duration: number
  delay: number
}[]

const positionRandoms = logoPositions.map(() => {
  return {
    duration: FLOAT_MIN_DURATION + Math.random() * FLOAT_DURATION_SPREAD,
    delay: Math.random() * 2
  }
})

type FloatingLogosProps = {
  variants: Variants
}

export const FloatingLogos = ({ variants }: FloatingLogosProps) => {
  const isReducedMotion = useReducedMotion()
  const logosPerPosition = Math.floor(logos.length / logoPositions.length)
  const remainingLogos = logos.length % logoPositions.length

  const positionsWithLogos = logoPositions.map((position, index) => {
    const startIndex =
      index * logosPerPosition + Math.min(index, remainingLogos)
    const endIndex =
      startIndex + logosPerPosition + (index < remainingLogos ? 1 : 0)
    const positionLogos = logos.slice(startIndex, endIndex)
    const random = positionRandoms[index] ?? {
      duration: FLOAT_MIN_DURATION,
      delay: 0
    }

    return {
      ...position,
      logos: positionLogos,
      index,
      randomDuration: random.duration,
      randomDelay: random.delay
    }
  })

  return (
    <>
      {positionsWithLogos.map((position, index) => {
        return (
          <motion.div
            variants={variants}
            initial={isReducedMotion ? false : 'hidden'}
            animate="visible"
            custom={{
              delay: 1 + LOGO_ENTRANCE_STAGGER * index
            }}
            key={position.index}
            className={`absolute ${position.x} ${position.y}`}
          >
            <motion.div
              animate={
                isReducedMotion
                  ? undefined
                  : {
                      y: [0, -FLOAT_HEIGHT, 0],
                      rotate: [0, FLOAT_TILT_DEGREES, -FLOAT_TILT_DEGREES, 0]
                    }
              }
              transition={{
                repeat: Infinity,
                duration: position.randomDuration,
                ease: 'easeInOut',
                times: [0, FLOAT_PEAK_TIME, 1],
                delay: position.randomDelay
              }}
            >
              <LogoCarousel
                columnCount={1}
                logos={position.logos}
                cycleInterval={position.duration}
                initialDelay={position.delay}
              />
            </motion.div>
          </motion.div>
        )
      })}
    </>
  )
}
