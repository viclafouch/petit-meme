/* oxlint-disable id-length */
import * as React from 'react'
import { cn } from '~/lib/utils'

type StarLayerProps = {
  count: number
  size: number
  durationInSeconds: number
  starColor: string
  animated: boolean
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
  durationInSeconds,
  starColor,
  animated
}: StarLayerProps) => {
  const [boxShadow, setBoxShadow] = React.useState<string>('')

  React.useEffect(() => {
    setBoxShadow(generateStars(count, starColor))
  }, [count, starColor])

  return (
    <div
      data-slot="star-layer"
      className={cn(
        'absolute top-0 left-0 w-full h-500',
        animated && 'motion-safe:animate-stars-drift'
      )}
      style={
        animated ? { animationDuration: `${durationInSeconds}s` } : undefined
      }
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
    </div>
  )
}

type StarsBackgroundProps = React.ComponentProps<'div'> & {
  speed?: number
  starColor?: string
  animated?: boolean
}

export const StarsBackground = ({
  children,
  className,
  speed = 50,
  starColor = '#fff',
  animated = true,
  ...props
}: StarsBackgroundProps) => {
  return (
    <div
      data-slot="stars-background"
      className={cn(
        'relative size-full overflow-clip dark:bg-[radial-gradient(ellipse_at_bottom,#141414_0%,#000_100%)] bg-white',
        className
      )}
      {...props}
      role="presentation"
    >
      <div className="max-lg:hidden">
        <StarLayer
          count={1000}
          size={1}
          durationInSeconds={speed}
          starColor={starColor}
          animated={animated}
        />
        <StarLayer
          count={400}
          size={2}
          durationInSeconds={speed * 2}
          starColor={starColor}
          animated={animated}
        />
        <StarLayer
          count={200}
          size={3}
          durationInSeconds={speed * 3}
          starColor={starColor}
          animated={animated}
        />
      </div>
      {children}
    </div>
  )
}
