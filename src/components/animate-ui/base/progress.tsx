import * as React from 'react'
import { motion, type Transition } from 'motion/react'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from '~/lib/utils'

const MotionProgressIndicator = motion.create(ProgressPrimitive.Indicator)

type ProgressProps = ProgressPrimitive.Root.Props & {
  transition?: Transition
}

const defaultTransition = {
  type: 'spring',
  stiffness: 100,
  damping: 30
} as const

const Progress = ({
  className,
  value,
  transition = defaultTransition,
  ...props
}: ProgressProps) => {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} {...props}>
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={cn(
          'relative block h-2 w-full overflow-hidden rounded-full bg-secondary',
          className
        )}
      >
        <MotionProgressIndicator
          data-slot="progress-indicator"
          className="block h-full rounded-full bg-primary"
          style={{ width: '100%' }}
          // oxlint-disable-next-line id-length
          animate={{ x: `-${100 - (value ?? 0)}%` }}
          initial={false}
          transition={transition}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress, type ProgressProps }
