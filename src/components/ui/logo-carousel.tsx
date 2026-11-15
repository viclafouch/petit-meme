/* oxlint-disable id-length */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export type Logo = {
  name: string
  id: number
  img: string
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]

  // oxlint-disable-next-line no-plusplus
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }

  return shuffled
}

const distributeLogos = (allLogos: Logo[], columnCount: number): Logo[][] => {
  const shuffled = shuffleArray(allLogos)
  const columns: Logo[][] = Array.from({ length: columnCount }, () => {
    return []
  })

  for (const [index, logo] of shuffled.entries()) {
    columns[index % columnCount]!.push(logo)
  }

  const maxLength = Math.max(
    ...columns.map((col) => {
      return col.length
    })
  )

  for (const col of columns) {
    while (col.length < maxLength) {
      col.push(shuffled[Math.floor(Math.random() * shuffled.length)]!)
    }
  }

  return columns
}

type LogoColumnProps = {
  logos: Logo[]
  index: number
  currentTime: number
  cycleInterval: number
}

const LogoColumn: React.FC<LogoColumnProps> = React.memo(
  ({ logos, index, currentTime, cycleInterval }) => {
    const columnDelay = index * 200
    const adjustedTime =
      (currentTime + columnDelay) % (cycleInterval * logos.length)
    const currentIndex = Math.floor(adjustedTime / cycleInterval)

    return (
      <div className="relative overflow-hidden md:h-24 md:w-48">
        {/* AnimatePresence enables animation of components that are removed from the DOM */}
        <AnimatePresence mode="wait">
          {/* Framer Motion component for each logo */}
          <motion.div
            key={`${logos[currentIndex]!.id}-${currentIndex}`}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ y: '10%', opacity: 0, filter: 'blur(8px)' }}
            animate={{
              y: '0%',
              opacity: 1,
              filter: 'blur(0px)',
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
                mass: 1,
                bounce: 0.2,
                duration: 0.5
              }
            }}
            exit={{
              y: '-20%',
              opacity: 0,
              filter: 'blur(6px)',
              transition: {
                type: 'tween',
                ease: 'easeIn',
                duration: 0.3
              }
            }}
          >
            <img
              src={logos[currentIndex]!.img}
              className="object-contain w-full h-full"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }
)

LogoColumn.displayName = 'LogoColumn'

const LogoCarousel = ({
  columnCount = 2,
  logos,
  cycleInterval = 2000,
  initialDelay = 0
}: {
  columnCount?: number
  logos: Logo[]
  cycleInterval?: number
  initialDelay?: number
}) => {
  const [logoSets, setLogoSets] = useState<Logo[][]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isOnScreen, setIsOnScreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  if (!logos || logos.length === 0) {
    throw new Error('No logos provided to LogoCarousel')
  }

  const allLogos: Logo[] = useMemo(() => {
    return logos.length > 0 ? logos : []
  }, [logos])

  useEffect(() => {
    const distributedLogos = distributeLogos(allLogos, columnCount)
    setLogoSets(distributedLogos)
  }, [allLogos])

  const updateTime = useCallback(() => {
    setCurrentTime((prevTime) => {
      return prevTime + 100
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return () => {}
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsOnScreen(entry?.isIntersecting ?? false)
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!isOnScreen) {
      return () => {}
    }

    let intervalId: ReturnType<typeof setInterval> | undefined

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(updateTime, 100)
    }, initialDelay)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [updateTime, initialDelay, isOnScreen])

  return (
    <div ref={containerRef} aria-hidden="true" className="flex space-x-4">
      {logoSets.map((logoItems, index) => {
        return (
          <LogoColumn
            key={index}
            logos={logoItems}
            index={index}
            currentTime={currentTime}
            cycleInterval={cycleInterval}
          />
        )
      })}
    </div>
  )
}

export { LogoCarousel }
export default LogoCarousel
