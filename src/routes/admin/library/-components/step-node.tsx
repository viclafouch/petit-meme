import { LoaderCircle, X } from 'lucide-react'
import { motion, type TargetAndTransition, type Transition } from 'motion/react'
import { cn } from '~/lib/utils'
import type { PublishStepStatus } from '~/routes/admin/library/-lib/publish-run'

const NODE_POP_SCALE = 1.18
const HALO_SCALE = 1.7
const HALO_OPACITY = 0.5

const NODE_REST = { scale: 1 } as const satisfies TargetAndTransition
const NODE_POP = {
  scale: [1, NODE_POP_SCALE, 1]
} as const satisfies TargetAndTransition
const NODE_POP_TRANSITION = {
  duration: 0.35,
  ease: 'easeOut'
} as const satisfies Transition
const CHECK_TRANSITION = {
  duration: 0.3,
  ease: 'easeOut',
  delay: 0.05
} as const satisfies Transition
const HALO_ANIMATION = {
  scale: [1, HALO_SCALE],
  opacity: [HALO_OPACITY, 0]
} as const satisfies TargetAndTransition
const HALO_TRANSITION = {
  duration: 1.4,
  ease: 'easeOut',
  repeat: Infinity
} as const satisfies Transition
type StepNodeProps = {
  status: PublishStepStatus
}

export const StepNode = ({ status }: StepNodeProps) => {
  return (
    <motion.span
      aria-hidden
      initial={false}
      animate={status === 'done' ? NODE_POP : NODE_REST}
      transition={NODE_POP_TRANSITION}
      className={cn(
        'relative flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
        status === 'pending' && 'border-border bg-card',
        status === 'active' && 'border-info/60 bg-info/15 text-info',
        status === 'done' &&
          'border-success-foreground/40 bg-success text-success-foreground',
        status === 'failed' &&
          'border-destructive/60 bg-destructive/15 text-destructive'
      )}
    >
      {status === 'pending' ? (
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      ) : null}
      {status === 'active' ? (
        <>
          <motion.span
            className="absolute inset-0 rounded-full border border-info"
            animate={HALO_ANIMATION}
            transition={HALO_TRANSITION}
          />
          <LoaderCircle className="size-3.5 animate-spin" />
        </>
      ) : null}
      {status === 'done' ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={CHECK_TRANSITION}
          />
        </svg>
      ) : null}
      {status === 'failed' ? <X className="size-3.5" /> : null}
    </motion.span>
  )
}
