import { OG_MEME_THUMBNAIL_SOURCE } from '~/constants/og'
import { OgBrandBar } from './og-backdrop'

const BACKDROP_BLEED = '-8%'

export const OgMemeTemplate = () => {
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
      <div
        tw="relative flex items-center justify-center"
        style={{
          width: '168px',
          height: '168px',
          borderRadius: '9999px',
          border: '6px solid rgba(255,255,255,0.92)',
          backgroundImage: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
        }}
      >
        <div
          style={{
            width: '58px',
            height: '66px',
            marginLeft: '12px',
            backgroundColor: '#ffffff',
            clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)'
          }}
        />
      </div>
      <OgBrandBar />
    </div>
  )
}
