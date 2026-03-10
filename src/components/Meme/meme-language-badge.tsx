import { CONTENT_LOCALE_FLAGS } from '@/components/icon/flags'
import type { MemeContentLocale } from '@/db/generated/prisma/enums'
import { getContentLocaleLabel } from '@/helpers/i18n-content'
import { m } from '@/paraglide/messages.js'

type MemeLanguageBadgeParams = {
  contentLocale: Exclude<MemeContentLocale, 'UNIVERSAL'>
  showLabel?: boolean
}

export const MemeLanguageBadge = ({
  contentLocale,
  showLabel = false
}: MemeLanguageBadgeParams) => {
  const label = getContentLocaleLabel(contentLocale)
  const ariaLabel = m.meme_audio_language({ language: label })
  const Flag = CONTENT_LOCALE_FLAGS[contentLocale]

  return (
    <span
      className="inline-flex items-center gap-1 text-muted-foreground text-xs"
      aria-label={ariaLabel}
    >
      {Flag ? <Flag className="size-3.5 shrink-0 rounded-sm" /> : null}
      {showLabel ? label : null}
    </span>
  )
}
