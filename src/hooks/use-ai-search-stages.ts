/* oxlint-disable react/react-compiler -- timer-based animation hook with intentional setState in effects */
import React from 'react'
import {
  AI_SEARCH_STAGE_KEYS,
  AI_SEARCH_STAGE_LINGER_MS,
  AI_SEARCH_STAGE_MAX_DELAY_MS,
  AI_SEARCH_STAGE_MIN_DELAY_MS
} from '~/constants/ai-search'
import { getRandomFloatInRange } from '~/helpers/number'

export type Stage = {
  key: (typeof AI_SEARCH_STAGE_KEYS)[number]
  status: 'pending' | 'active' | 'completed'
}

type StagesState = {
  isActive: boolean
  stages: readonly Stage[]
  isAllCompleted: boolean
  reset: () => void
}

const INITIAL_STAGES: readonly Stage[] = AI_SEARCH_STAGE_KEYS.map((key) => {
  return { key, status: 'pending' }
})

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
  return getRandomFloatInRange(
    AI_SEARCH_STAGE_MIN_DELAY_MS,
    AI_SEARCH_STAGE_MAX_DELAY_MS
  )
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
    }, AI_SEARCH_STAGE_LINGER_MS)
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

  function reset() {
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current)
      stageTimerRef.current = null
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    activeIndexRef.current = -1
    setActiveIndex(-1)
    setIsAllCompleted(false)
  }

  const isActive = activeIndex >= 0
  const stages = isActive ? buildStages(activeIndex) : INITIAL_STAGES

  return { isActive, stages, isAllCompleted, reset }
}
