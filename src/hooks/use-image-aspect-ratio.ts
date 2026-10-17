import React from 'react'

const WIDESCREEN_WIDTH = 16
const WIDESCREEN_HEIGHT = 9
const DEFAULT_ASPECT_RATIO = WIDESCREEN_WIDTH / WIDESCREEN_HEIGHT

export const useImageAspectRatio = (src: string) => {
  const [aspectRatio, setAspectRatio] = React.useState(DEFAULT_ASPECT_RATIO)

  React.useEffect(() => {
    const img = new Image()

    const handleLoad = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspectRatio(img.naturalWidth / img.naturalHeight)
      }
    }

    img.addEventListener('load', handleLoad, { once: true })
    img.src = src

    if (img.complete) {
      handleLoad()
    }

    return () => {
      img.removeEventListener('load', handleLoad)
    }
  }, [src])

  return aspectRatio
}
