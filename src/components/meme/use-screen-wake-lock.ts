import React from 'react'

const requestScreenWakeLock = async () => {
  try {
    return await navigator.wakeLock.request('screen')
  } catch {
    return null
  }
}

type UseScreenWakeLockParams = {
  enabled: boolean
}

export const useScreenWakeLock = ({ enabled }: UseScreenWakeLockParams) => {
  React.useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      return () => {}
    }

    let sentinel: WakeLockSentinel | null = null
    let isReleased = false

    const acquire = async () => {
      if (
        document.visibilityState !== 'visible' ||
        sentinel?.released === false
      ) {
        return
      }

      const nextSentinel = await requestScreenWakeLock()

      if (isReleased) {
        void nextSentinel?.release()

        return
      }

      sentinel = nextSentinel
    }

    const acquireWhenVisible = () => {
      void acquire()
    }

    acquireWhenVisible()
    document.addEventListener('visibilitychange', acquireWhenVisible)

    return () => {
      isReleased = true
      document.removeEventListener('visibilitychange', acquireWhenVisible)
      void sentinel?.release()
    }
  }, [enabled])
}
