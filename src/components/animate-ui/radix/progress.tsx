import * as React from 'react'
import { motion, type Transition } from 'motion/react'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { cn } from '~/lib/utils'

const MotionProgressIndicator = motion.create(ProgressPrimitive.Indicator)

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
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
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      value={value}
      {...props}
    >
      <MotionProgressIndicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary rounded-full"
        // oxlint-disable-next-line id-length
        animate={{ x: `-${100 - (value || 0)}%` }}
        initial={false}
        transition={transition}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress, type ProgressProps }
