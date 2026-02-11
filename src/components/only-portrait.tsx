import React from 'react'

export async function lockOrientiation(orientation: string) {
  try {
    // @ts-expect-error: screen.orientation.lock is not yet in all TS lib types
    await screen.orientation.lock(orientation)
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name !== 'NotSupportedError' &&
      error.name !== 'AbortError'
    ) {
      // See https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock#exceptions
      // eslint-disable-next-line no-console
      console.warn(error)
    }
  }
}

export const OnlyPortrait = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    void lockOrientiation('portrait')
  }, [])

  return children
}
