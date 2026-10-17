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

const IDLE_INDEX = -1

const INITIAL_STAGES: readonly Stage[] = AI_SEARCH_STAGE_KEYS.map((key) => {
  return { key, status: 'pending' }
})

const LAST_STAGE_INDEX = INITIAL_STAGES.length - 1

const COMPLETED_INDEX = INITIAL_STAGES.length

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
  const [activeIndex, setActiveIndex] = React.useState(
    isPending ? 0 : IDLE_INDEX
  )
  const [isAllCompleted, setIsAllCompleted] = React.useState(false)
  const [previousIsPending, setPreviousIsPending] = React.useState(isPending)

  if (isPending !== previousIsPending) {
    setPreviousIsPending(isPending)

    if (isPending) {
      setActiveIndex(0)
      setIsAllCompleted(false)
    } else if (activeIndex === LAST_STAGE_INDEX) {
      setActiveIndex(COMPLETED_INDEX)
      setIsAllCompleted(true)
    }
  }

  React.useEffect(() => {
    const isAdvancing = activeIndex >= 0 && activeIndex < LAST_STAGE_INDEX
    const isWaitingToComplete = activeIndex === LAST_STAGE_INDEX && !isPending

    if (!isAdvancing && !isWaitingToComplete) {
      return
    }

    const stageTimer = setTimeout(() => {
      setActiveIndex((previousIndex) => {
        return previousIndex + 1
      })

      if (isWaitingToComplete) {
        setIsAllCompleted(true)
      }
    }, getRandomStageDelay())

    return () => {
      clearTimeout(stageTimer)
    }
  }, [activeIndex, isPending])

  React.useEffect(() => {
    if (activeIndex !== COMPLETED_INDEX) {
      return
    }

    const hideTimer = setTimeout(() => {
      setActiveIndex(IDLE_INDEX)
    }, AI_SEARCH_STAGE_LINGER_MS)

    return () => {
      clearTimeout(hideTimer)
    }
  }, [activeIndex])

  const reset = () => {
    setActiveIndex(IDLE_INDEX)
    setIsAllCompleted(false)
  }

  const isActive = activeIndex >= 0
  const stages = isActive ? buildStages(activeIndex) : INITIAL_STAGES

  return { isActive, stages, isAllCompleted, reset }
}
