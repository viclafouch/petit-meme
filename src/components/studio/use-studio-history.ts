import React from 'react'
import { z } from 'zod'
import {
  useLocation,
  useMatchRoute,
  useNavigate,
  useRouter,
  type HistoryState
} from '@tanstack/react-router'
import { studioMemeSchema, type StudioMeme } from '~/constants/studio'

const STUDIO_ROUTE_ENTRY_KEY = 'isStudioAboveMemePage'
const STUDIO_SHEET_ENTRY_KEY = 'studioSheet'
const STUDIO_PATH_SUFFIX = /\/studio\/?$/u
const PAGE_LIFE_ID = performance.timeOrigin

const studioSheetEntrySchema = z.object({
  pageLifeId: z.literal(PAGE_LIFE_ID),
  meme: studioMemeSchema
})

const matchIsStudioRouteEntry = (state: unknown) => {
  return (
    typeof state === 'object' &&
    state !== null &&
    STUDIO_ROUTE_ENTRY_KEY in state &&
    state[STUDIO_ROUTE_ENTRY_KEY] === true
  )
}

const readStudioSheetMeme = (state: object) => {
  if (!(STUDIO_SHEET_ENTRY_KEY in state)) {
    return null
  }

  const entry = studioSheetEntrySchema.safeParse(state[STUDIO_SHEET_ENTRY_KEY])

  return entry.success ? entry.data.meme : null
}

export const markStudioEntry = (previousState: HistoryState) => {
  const nextState = { ...previousState, [STUDIO_ROUTE_ENTRY_KEY]: true }

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
    [STUDIO_ROUTE_ENTRY_KEY]: true
  }

  window.history.replaceState(pageState, '', memeUrl)
  window.history.pushState(studioState, '', studioUrl)
}

export const useCloseStudio = () => {
  const router = useRouter()

  return () => {
    router.history.back()
  }
}

export const usePlaceMemePageBelowStudio = () => {
  React.useEffect(() => {
    if (!matchIsStudioRouteEntry(window.history.state)) {
      placeMemePageBelow()
    }
  }, [])
}

export const useOpenStudioSheet = () => {
  const navigate = useNavigate()

  return (meme: StudioMeme) => {
    void navigate({
      to: '.',
      params: true,
      search: true,
      hash: true,
      resetScroll: false,
      state: (previousState) => {
        return {
          ...previousState,
          [STUDIO_SHEET_ENTRY_KEY]: { pageLifeId: PAGE_LIFE_ID, meme }
        }
      }
    })
  }
}

export const useStudioSheetMeme = () => {
  return useLocation({
    select: (location) => {
      return readStudioSheetMeme(location.state)
    }
  })
}

export const useIsStudioOpen = () => {
  const matchRoute = useMatchRoute()
  const isStudioRoute = matchRoute({ to: '/memes/$memeId/studio' }) !== false

  return useStudioSheetMeme() !== null || isStudioRoute
}
