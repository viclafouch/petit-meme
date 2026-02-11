/* eslint-disable react/no-object-type-as-default-prop */
/* eslint-disable id-length */
import * as React from 'react'
import {
  type HTMLMotionProps,
  motion,
  type SpringOptions,
  type Transition,
  useMotionValue,
  useSpring
} from 'motion/react'
import { cn } from '@/lib/utils'

type StarLayerProps = HTMLMotionProps<'div'> & {
  count: number
  size: number
  transition: Transition
  starColor: string
}

function generateStars(count: number, starColor: string) {
  const shadows: string[] = []

  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(Math.random() * 4000) - 2000
    const y = Math.floor(Math.random() * 4000) - 2000
    shadows.push(`${x}px ${y}px ${starColor}`)
  }

  return shadows.join(', ')
}

const StarLayer = ({
  count,
  size,
  transition,
  starColor,
  className,
  ...props
}: StarLayerProps) => {
  const [boxShadow, setBoxShadow] = React.useState<string>('')

  React.useEffect(() => {
    setBoxShadow(generateStars(count, starColor))
  }, [count, starColor])

  return (
    <motion.div
      data-slot="star-layer"
      animate={{ y: [0, -2000] }}
      transition={transition}
      className={cn(
        'absolute top-0 left-0 w-full h-500 will-change-transform',
        className
      )}
      {...props}
    >
      <div
        className="absolute bg-transparent rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow
        }}
      />
      <div
        className="absolute bg-transparent rounded-full top-500"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          boxShadow
        }}
      />
    </motion.div>
  )
}

type StarsBackgroundProps = React.ComponentProps<'div'> & {
  factor?: number
  speed?: number
  transition?: SpringOptions
  starColor?: string
}

export const StarsBackground = ({
  children,
  className,
  speed = 50,
  transition = { stiffness: 50, damping: 20 },
  starColor = '#fff',
  ...props
}: StarsBackgroundProps) => {
  const offsetX = useMotionValue(1)
  const offsetY = useMotionValue(1)

  const springX = useSpring(offsetX, transition)
  const springY = useSpring(offsetY, transition)

  return (
    <div
      data-slot="stars-background"
      className={cn(
        'relative size-full overflow-hidden dark:bg-[radial-gradient(ellipse_at_bottom,#262626_0%,#000_100%)] bg-white',
        className
      )}
      {...props}
      role="presentation"
    >
      <motion.div style={{ x: springX, y: springY }} className="max-lg:hidden">
        <StarLayer
          count={1000}
          size={1}
          transition={{ repeat: Infinity, duration: speed, ease: 'linear' }}
          starColor={starColor}
        />
        <StarLayer
          count={400}
          size={2}
          transition={{
            repeat: Infinity,
            duration: speed * 2,
            ease: 'linear'
          }}
          starColor={starColor}
        />
        <StarLayer
          count={200}
          size={3}
          transition={{
            repeat: Infinity,
            duration: speed * 3,
            ease: 'linear'
          }}
          starColor={starColor}
        />
      </motion.div>
      {children}
    </div>
  )
}
