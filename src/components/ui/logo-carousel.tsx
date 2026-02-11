/* eslint-disable id-length */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

// Define the structure for our logo objects
export type Logo = {
  name: string
  id: number
  img: string
}

// Utility function to randomly shuffle an array
// This is used to mix up the order of logos for a more dynamic display
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]

  // eslint-disable-next-line no-plusplus
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }

  return shuffled
}

// Utility function to distribute logos across multiple columns
// This ensures each column has a balanced number of logos
const distributeLogos = (allLogos: Logo[], columnCount: number): Logo[][] => {
  const shuffled = shuffleArray(allLogos)
  const columns: Logo[][] = Array.from({ length: columnCount }, () => {
    return []
  })

  // Distribute logos evenly across columns
  for (const [index, logo] of shuffled.entries()) {
    columns[index % columnCount]!.push(logo)
  }

  // Ensure all columns have the same number of logos by filling shorter columns
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

// Props for the LogoColumn component
type LogoColumnProps = {
  logos: Logo[]
  index: number
  currentTime: number
  cycleInterval: number
}

// LogoColumn component: Displays a single column of animated logos
const LogoColumn: React.FC<LogoColumnProps> = React.memo(
  ({ logos, index, currentTime, cycleInterval }) => {
    const columnDelay = index * 200
    // Calculate which logo should be displayed based on the current time
    const adjustedTime =
      (currentTime + columnDelay) % (cycleInterval * logos.length)
    const currentIndex = Math.floor(adjustedTime / cycleInterval)

    return (
      // Framer Motion component for the column container
      <div className="relative overflow-hidden md:h-24 md:w-48">
        {/* AnimatePresence enables animation of components that are removed from the DOM */}
        <AnimatePresence mode="wait">
          {/* Framer Motion component for each logo */}
          <motion.div
            key={`${logos[currentIndex]!.id}-${currentIndex}`}
            className="absolute inset-0 flex items-center justify-center"
            // Animation for when the logo enters
            initial={{ y: '10%', opacity: 0, filter: 'blur(8px)' }}
            // Animation for when the logo is displayed
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
            // Animation for when the logo exits
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
              alt={logos[currentIndex]!.name}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }
)

LogoColumn.displayName = 'LogoColumn'

// Main LogoCarousel component
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

  if (!logos || logos.length === 0) {
    throw new Error('No logos provided to LogoCarousel')
  }

  // Memoize the array of logos to prevent unnecessary re-renders
  const allLogos: Logo[] = useMemo(() => {
    return logos.length > 0 ? logos : []
  }, [logos])

  // Distribute logos across columns when the component mounts
  useEffect(() => {
    const distributedLogos = distributeLogos(allLogos, columnCount)
    setLogoSets(distributedLogos)
  }, [allLogos])

  // Function to update the current time (used for logo cycling)
  const updateTime = useCallback(() => {
    setCurrentTime((prevTime) => {
      return prevTime + 100
    })
  }, [])

  useEffect(() => {
    // Apply initial delay before starting the timer
    const timeoutId = setTimeout(() => {
      const intervalId = setInterval(updateTime, 100)

      return () => {
        return clearInterval(intervalId)
      }
    }, initialDelay)

    return () => {
      return clearTimeout(timeoutId)
    }
  }, [updateTime, initialDelay])

  // Render the logo columns
  return (
    <div className="flex space-x-4">
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
