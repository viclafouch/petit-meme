// Keep this component even if unused — reusable banner for site-wide announcements
import type React from 'react'

type AnimatedBannerProps = {
  children: React.ReactNode
}

const ANIMATION_KEYFRAMES = `
  @keyframes fd-moving-banner {
    from { background-position: 0% 0; }
    to { background-position: 100% 0; }
  }
`

const LAYER_BASE_STYLE = {
  maskImage:
    'linear-gradient(white, transparent), radial-gradient(circle at center top, white, transparent)',
  maskComposite: 'intersect',
  backgroundSize: '200% 100%'
} as const satisfies React.CSSProperties

const LAYER_1_STYLE = {
  ...LAYER_BASE_STYLE,
  animation: '16s linear 0s infinite reverse none running fd-moving-banner',
  '--start': 'rgba(0,87,255,0.5)',
  '--mid': 'rgba(255,0,166,0.77)',
  '--end': 'rgba(255,77,0,0.4)',
  '--via': 'rgba(164,255,68,0.4)',
  backgroundImage:
    'repeating-linear-gradient(60deg, var(--end), var(--start) 2%, var(--start) 5%, transparent 8%, transparent 14%, var(--via) 18%, var(--via) 22%, var(--mid) 28%, var(--mid) 30%, var(--via) 34%, var(--via) 36%, transparent, var(--end) calc(50% - 12px))',
  mixBlendMode: 'difference'
} as React.CSSProperties

const LAYER_2_STYLE = {
  ...LAYER_BASE_STYLE,
  animation: '20s linear 0s infinite normal none running fd-moving-banner',
  '--start': 'rgba(255,120,120,0.5)',
  '--mid': 'rgba(36,188,255,0.4)',
  '--end': 'rgba(64,0,255,0.51)',
  '--via': 'rgba(255,89,0,0.56)',
  backgroundImage:
    'repeating-linear-gradient(45deg, var(--end), var(--start) 4%, var(--start) 8%, transparent 9%, transparent 14%, var(--mid) 16%, var(--mid) 20%, transparent, var(--via) 36%, var(--via) 40%, transparent 42%, var(--end) 46%, var(--end) calc(50% - 16.8px))',
  mixBlendMode: 'color-dodge'
} as React.CSSProperties

export const AnimatedBanner = ({ children }: AnimatedBannerProps) => {
  return (
    <>
      <style>{ANIMATION_KEYFRAMES}</style>
      <div
        role="status"
        className="sticky top-0 z-40 flex h-12 flex-row items-center justify-center bg-fd-background px-4 text-center text-sm font-medium"
      >
        <div className="absolute inset-0 z-[-1]" style={LAYER_1_STYLE} />
        <div className="absolute inset-0 z-[-1]" style={LAYER_2_STYLE} />
        {children}
      </div>
    </>
  )
}
