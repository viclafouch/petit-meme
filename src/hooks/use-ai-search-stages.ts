import React from 'react'
import { getRandomFloatInRange } from '~/helpers/number'

const STAGE_MIN_DELAY_MS = 1500
const STAGE_MAX_DELAY_MS = 2500
const COMPLETED_LINGER_MS = 600

export type Stage = {
  key: 'context' | 'keywords' | 'search'
  status: 'pending' | 'active' | 'completed'
}

type StagesState = {
  isActive: boolean
  stages: readonly Stage[]
  isAllCompleted: boolean
}

const INITIAL_STAGES = [
  { key: 'context', status: 'pending' },
  { key: 'keywords', status: 'pending' },
  { key: 'search', status: 'pending' }
] as const satisfies readonly Stage[]

function buildStages(activeIndex: number): readonly Stage[] {
  return INITIAL_STAGES.map((stage, index) => {
    if (index < activeIndex) {
      return { ...stage, status: 'completed' }
    }

    if (index === activeIndex) {
      return { ...stage, status: 'active' }
    }

    return { ...stage, status: 'pending' }
  })
}

function getRandomStageDelay() {
  return getRandomFloatInRange(STAGE_MIN_DELAY_MS, STAGE_MAX_DELAY_MS)
}

export function useAiSearchStages(isPending: boolean): StagesState {
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const [isAllCompleted, setIsAllCompleted] = React.useState(false)
  const activeIndexRef = React.useRef(-1)
  const stageTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMutationDoneRef = React.useRef(false)

  React.useEffect(() => {
    if (isPending) {
      isMutationDoneRef.current = false
      setIsAllCompleted(false)

      if (stageTimerRef.current) {
        clearTimeout(stageTimerRef.current)
      }

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }

      activeIndexRef.current = 0
      setActiveIndex(0)
      scheduleNextStage()

      return
    }

    isMutationDoneRef.current = true

    if (activeIndexRef.current >= INITIAL_STAGES.length - 1) {
      if (stageTimerRef.current) {
        clearTimeout(stageTimerRef.current)
      }

      completeStages()
    }
  }, [isPending])

  React.useEffect(() => {
    return () => {
      if (stageTimerRef.current) {
        clearTimeout(stageTimerRef.current)
      }

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  function completeStages() {
    stageTimerRef.current = null
    activeIndexRef.current = INITIAL_STAGES.length
    setActiveIndex(INITIAL_STAGES.length)
    setIsAllCompleted(true)

    hideTimerRef.current = setTimeout(() => {
      activeIndexRef.current = -1
      setActiveIndex(-1)
    }, COMPLETED_LINGER_MS)
  }

  function scheduleNextStage() {
    stageTimerRef.current = setTimeout(() => {
      const prev = activeIndexRef.current

      if (prev < INITIAL_STAGES.length - 1) {
        activeIndexRef.current = prev + 1
        setActiveIndex(prev + 1)
        scheduleNextStage()

        return
      }

      if (!isMutationDoneRef.current) {
        scheduleNextStage()

        return
      }

      completeStages()
    }, getRandomStageDelay())
  }

  const isActive = activeIndex >= 0
  const stages = isActive ? buildStages(activeIndex) : INITIAL_STAGES

  return { isActive, stages, isAllCompleted }
}
