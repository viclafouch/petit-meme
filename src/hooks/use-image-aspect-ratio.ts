import React from 'react'

const DEFAULT_ASPECT_RATIO = 16 / 9

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
