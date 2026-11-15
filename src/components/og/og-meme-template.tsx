import { OgBrandBar } from './og-backdrop'
import { OgThumbnailFrame } from './og-thumbnail-frame'

export const OgMemeTemplate = () => {
  return (
    <OgThumbnailFrame>
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
    </OgThumbnailFrame>
  )
}
