import React from 'react'
import { useRouter, type HistoryState } from '@tanstack/react-router'

const STUDIO_ENTRY_KEY = 'isStudioAboveMemePage'
const STUDIO_PATH_SUFFIX = /\/studio\/?$/u

const matchIsStudioEntry = (state: unknown) => {
  return (
    typeof state === 'object' &&
    state !== null &&
    STUDIO_ENTRY_KEY in state &&
    state[STUDIO_ENTRY_KEY] === true
  )
}

export const markStudioEntry = (previousState: HistoryState) => {
  const nextState = { ...previousState, [STUDIO_ENTRY_KEY]: true }

  return nextState
}

const readTanStackIndex = (state: object) => {
  return '__TSR_index' in state && typeof state.__TSR_index === 'number'
    ? state.__TSR_index
    : 0
}

const placeMemePageBelow = () => {
  const state: unknown = window.history.state
  const pageState = typeof state === 'object' && state !== null ? state : {}
  const studioUrl = new URL(window.location.href)
  const memeUrl = new URL(studioUrl)
  memeUrl.pathname = studioUrl.pathname.replace(STUDIO_PATH_SUFFIX, '')
  const key = crypto.randomUUID()
  const studioState = {
    ...pageState,
    key,
    __TSR_key: key,
    __TSR_index: readTanStackIndex(pageState) + 1,
    [STUDIO_ENTRY_KEY]: true
  }

  window.history.replaceState(pageState, '', memeUrl)
  window.history.pushState(studioState, '', studioUrl)
}

export const useStudioHistory = () => {
  const router = useRouter()

  React.useEffect(() => {
    if (!matchIsStudioEntry(window.history.state)) {
      placeMemePageBelow()
    }
  }, [])

  return {
    close: () => {
      router.history.back()
    }
  }
}
