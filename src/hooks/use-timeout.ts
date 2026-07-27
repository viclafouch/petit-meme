import React from 'react'

type UseTimeoutParams = {
  callback: () => void
  delayMs: number
  isEnabled?: boolean
}

export const useTimeout = ({
  callback,
  delayMs,
  isEnabled = true
}: UseTimeoutParams) => {
  const onTimeout = React.useEffectEvent(callback)

  React.useEffect(() => {
    if (!isEnabled) {
      return () => {}
    }

    const timer = setTimeout(() => {
      onTimeout()
    }, delayMs)

    return () => {
      clearTimeout(timer)
    }
  }, [delayMs, isEnabled])
}
