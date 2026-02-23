import type { StudioSettings } from '@/constants/studio'
import { STUDIO_FONTS } from '@/constants/studio'
import { cn } from '@/lib/utils'

type StudioLiveOverlayParams = {
  settings: StudioSettings
}

export const StudioLiveOverlay = ({ settings }: StudioLiveOverlayParams) => {
  if (!settings.text.trim()) {
    return null
  }

  const font = STUDIO_FONTS.find((entry) => {
    return entry.id === settings.fontFamily
  })

  return (
    <div
      className={cn(
        'absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10 px-2',
        settings.textPosition === 'top' ? 'top-0' : 'bottom-0'
      )}
      aria-hidden="true"
    >
      <div
        className="w-full py-3 text-center whitespace-pre-wrap wrap-break-word"
        style={{
          backgroundColor:
            settings.bandOpacity < 1
              ? `color-mix(in srgb, ${settings.bandColor} ${Math.round(settings.bandOpacity * 100)}%, transparent)`
              : settings.bandColor,
          fontSize: `${settings.fontSize}px`,
          color: settings.fontColor,
          fontFamily: font?.cssFamily ?? 'Arial, sans-serif',
          lineHeight: 1.3
        }}
      >
        {settings.text}
      </div>
    </div>
  )
}
