/* eslint-disable id-length */
import React from 'react'
import type { Variants } from 'framer-motion'
import { motion } from 'framer-motion'
import LogoCarousel from '@/components/ui/logo-carousel'
import { logos } from '@/constants/config'

const logoPositions = [
  { x: 'left-0', y: 'top-0', duration: 8000, delay: 0 },
  {
    x: '-left-30',
    y: 'top-1/3 -translate-y-1/3',
    duration: 12000,
    delay: 2000
  },
  { x: 'left-0', y: 'bottom-0', duration: 10500, delay: 4000 },
  { x: 'right-0', y: 'top-0', duration: 9500, delay: 1000 },
  {
    x: '-right-30',
    y: 'top-1/3 -translate-y-1/3',
    duration: 11000,
    delay: 3000
  },
  { x: 'right-0', y: 'bottom-0', duration: 13000, delay: 5000 }
] as const satisfies {
  x: string
  y: string
  duration: number
  delay: number
}[]

export const FloatingLogos = ({ variants }: { variants: Variants }) => {
  const logosPerPosition = Math.floor(logos.length / logoPositions.length)
  const remainingLogos = logos.length % logoPositions.length

  const positionsWithLogos = logoPositions.map((position, index) => {
    const startIndex =
      index * logosPerPosition + Math.min(index, remainingLogos)
    const endIndex =
      startIndex + logosPerPosition + (index < remainingLogos ? 1 : 0)
    const positionLogos = logos.slice(startIndex, endIndex)

    return {
      ...position,
      logos: positionLogos,
      index
    }
  })

  return (
    <>
      {positionsWithLogos.map((position, index) => {
        return (
          <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
            custom={{
              delay: 1 + 0.2 * index
            }}
            key={position.index}
            className={`absolute ${position.x} ${position.y}`}
          >
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                repeat: Infinity,
                // eslint-disable-next-line react-hooks/purity
                duration: 4 + Math.random() * 4,
                ease: 'easeInOut',
                times: [0, 0.5, 1],
                // eslint-disable-next-line react-hooks/purity
                delay: Math.random() * 2
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
