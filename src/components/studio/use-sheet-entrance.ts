import React from 'react'

export const useSheetEntrance = (
  sheetRef: React.RefObject<HTMLElement | null>
) => {
  const [hasEntered, setHasEntered] = React.useState(false)

  React.useEffect(() => {
    const sheet = sheetRef.current

    if (sheet === null) {
      return () => {}
    }

    let isMounted = true

    const waitForEntrance = async () => {
      await Promise.allSettled(
        sheet.getAnimations().map((animation) => {
          return animation.finished
        })
      )

      if (isMounted) {
        setHasEntered(true)
      }
    }

    void waitForEntrance()

    return () => {
      isMounted = false
    }
  }, [sheetRef])

  return hasEntered
}
