import { MINUTE } from '~/constants/time'

const LAST_RELOAD_STORAGE_KEY = 'stale-chunk-reloaded-at'

const matchHasReloadedRecently = () => {
  const lastReloadAt = Number(sessionStorage.getItem(LAST_RELOAD_STORAGE_KEY))

  return Date.now() - lastReloadAt < MINUTE
}

export const reloadOnStaleChunk = () => {
  window.addEventListener('vite:preloadError', (event) => {
    if (matchHasReloadedRecently()) {
      return
    }

    event.preventDefault()
    sessionStorage.setItem(LAST_RELOAD_STORAGE_KEY, String(Date.now()))
    window.location.reload()
  })
}
