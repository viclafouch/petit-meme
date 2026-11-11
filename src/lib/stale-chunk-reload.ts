import { MINUTE } from '~/constants/time'

const LAST_RELOAD_STORAGE_KEY = 'stale-chunk-reloaded-at'

const matchHasReloadedRecently = () => {
  const lastReloadAt = Number(sessionStorage.getItem(LAST_RELOAD_STORAGE_KEY))

  return Date.now() - lastReloadAt < MINUTE
}

export const reloadOnStaleChunk = () => {
  window.addEventListener('vite:preloadError', () => {
    if (matchHasReloadedRecently()) {
      return
    }

    sessionStorage.setItem(LAST_RELOAD_STORAGE_KEY, String(Date.now()))
    window.location.reload()
  })
}
