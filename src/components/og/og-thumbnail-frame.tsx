import type React from 'react'
import { OG_MEME_THUMBNAIL_SOURCE } from '~/constants/og'

const BACKDROP_BLEED = '-8%'

type OgThumbnailFrameProps = {
  children?: React.ReactNode
}

export const OgThumbnailFrame = ({ children }: OgThumbnailFrameProps) => {
  return (
    <div
      tw="flex w-full h-full relative items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <img
        src={OG_MEME_THUMBNAIL_SOURCE}
        alt=""
        tw="absolute"
        style={{
          top: BACKDROP_BLEED,
          right: BACKDROP_BLEED,
          bottom: BACKDROP_BLEED,
          left: BACKDROP_BLEED,
          width: '116%',
          height: '116%',
          objectFit: 'cover',
          filter: 'blur(40px) brightness(0.5)'
        }}
      />
      <img
        src={OG_MEME_THUMBNAIL_SOURCE}
        alt=""
        tw="absolute inset-0 w-full h-full"
        style={{ objectFit: 'contain' }}
      />
      {children}
    </div>
  )
}
