import React from 'react'

type ContainedSize = {
  width: number
  height: number
}

export const useContainedSize = (
  containerRef: React.RefObject<HTMLElement | null>,
  aspectRatio: number
) => {
  const [size, setSize] = React.useState<ContainedSize>({ width: 0, height: 0 })

  React.useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) {
      return () => {}
    }

    const updateSize = () => {
      const availableWidth = container.clientWidth
      const availableHeight = container.clientHeight

      if (availableWidth <= 0 || availableHeight <= 0) {
        return
      }

      const containerRatio = availableWidth / availableHeight

      if (containerRatio > aspectRatio) {
        setSize({
          width: Math.round(availableHeight * aspectRatio),
          height: availableHeight
        })
      } else {
        setSize({
          width: availableWidth,
          height: Math.round(availableWidth / aspectRatio)
        })
      }
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [containerRef, aspectRatio])

  return size
}
