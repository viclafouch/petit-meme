import { Star } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '~/lib/utils'

const SPARK_COUNT = 6
const SPARK_DISTANCE_PX = 12
const SPARK_DURATION_S = 0.55
const SPARK_STAGGER_S = 0.03
const STAR_POP_SCALE = 1.3
const STAR_POP_DURATION_S = 0.3

const SPARK_ANGLES = Array.from({ length: SPARK_COUNT }, (_, index) => {
  return (index * 2 * Math.PI) / SPARK_COUNT
})

type BookmarkStarProps = {
  isActive: boolean
  className?: string
}

export const BookmarkStar = ({ isActive, className }: BookmarkStarProps) => {
  const isReducedMotion = useReducedMotion()

  return (
    <span
      aria-hidden="true"
      data-active={isActive || undefined}
      className={cn(
        'relative inline-grid size-4 shrink-0 place-items-center data-active:text-bookmark-foreground! data-active:[&_svg]:fill-bookmark-fill data-active:[&_svg]:stroke-bookmark-stroke',
        className
      )}
    >
      <motion.span
        className="grid place-items-center"
        initial={false}
        animate={{
          scale: isActive && !isReducedMotion ? [1, STAR_POP_SCALE, 1] : 1
        }}
        transition={{ duration: STAR_POP_DURATION_S, ease: 'easeOut' }}
      >
        <Star className="size-4" />
      </motion.span>
      <AnimatePresence initial={false}>
        {isActive && !isReducedMotion
          ? SPARK_ANGLES.map((angle, index) => {
              return (
                <motion.span
                  key={angle}
                  className="pointer-events-none absolute size-1 rounded-full bg-bookmark-spark"
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: Math.cos(angle) * SPARK_DISTANCE_PX,
                    y: Math.sin(angle) * SPARK_DISTANCE_PX,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: SPARK_DURATION_S,
                    delay: index * SPARK_STAGGER_S,
                    ease: 'easeOut'
                  }}
                />
              )
            })
          : null}
      </AnimatePresence>
    </span>
  )
}
