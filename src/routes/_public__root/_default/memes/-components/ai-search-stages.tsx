import { CheckIcon, LoaderCircleIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Stage } from '~/hooks/use-ai-search-stages'
import { m } from '~/paraglide/messages.js'

const STAGE_LABELS = {
  context: () => {
    return m.ai_search_stage_context()
  },
  keywords: () => {
    return m.ai_search_stage_keywords()
  },
  search: () => {
    return m.ai_search_stage_search()
  }
} as const satisfies Record<Stage['key'], () => string>

function getActiveStageKey(stages: readonly Stage[]): Stage['key'] {
  const active = stages.find((stage) => {
    return stage.status === 'active'
  })

  return active?.key ?? stages.at(-1)!.key
}

type AiSearchStagesProps = {
  stages: readonly Stage[]
}

export const AiSearchStages = ({ stages }: AiSearchStagesProps) => {
  const isReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={isReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={
        isReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: -4, transition: { duration: 0.25 } }
      }
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-y-3"
    >
      <span className="sr-only" role="status">
        {STAGE_LABELS[getActiveStageKey(stages)]()}
      </span>
      {stages.map((stage) => {
        const isVisible =
          stage.status === 'active' || stage.status === 'completed'

        return (
          <AnimatePresence key={stage.key}>
            {isVisible ? (
              <StageItem
                stage={stage}
                isReducedMotion={isReducedMotion ?? false}
              />
            ) : null}
          </AnimatePresence>
        )
      })}
    </motion.div>
  )
}

type StageItemProps = {
  stage: Stage
  isReducedMotion: boolean
}

const StageItem = ({ stage, isReducedMotion }: StageItemProps) => {
  const isCompleted = stage.status === 'completed'

  return (
    <motion.div
      initial={
        isReducedMotion ? false : { opacity: 0, y: 6, filter: 'blur(4px)' }
      }
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-center gap-2.5"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isCompleted ? (
          <motion.div
            key="check"
            initial={isReducedMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <CheckIcon
              className="text-amber-500 size-4"
              strokeWidth={3}
              aria-hidden="true"
            />
          </motion.div>
        ) : (
          <motion.div
            key="spinner"
            initial={isReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={
              isReducedMotion
                ? undefined
                : { opacity: 0, transition: { duration: 0.1 } }
            }
          >
            <LoaderCircleIcon
              className="text-amber-500 size-4 animate-spin"
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <span
        className="text-muted-foreground text-sm transition-colors duration-300 data-[completed=true]:text-foreground"
        data-completed={isCompleted ? 'true' : undefined}
      >
        {STAGE_LABELS[stage.key]()}
      </span>
    </motion.div>
  )
}
