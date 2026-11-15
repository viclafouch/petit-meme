import { CONTENT_LOCALE_FLAGS } from '~/components/icon/flags'
import type { MemeContentLocale } from '~/db/generated/prisma/enums'
import { getContentLocaleLabel } from '~/helpers/i18n-content'
import { m } from '~/paraglide/messages'

type MemeLanguageBadgeProps = {
  contentLocale: Exclude<MemeContentLocale, 'UNIVERSAL'>
  showLabel?: boolean
}

export const MemeLanguageBadge = ({
  contentLocale,
  showLabel = false
}: MemeLanguageBadgeProps) => {
  const label = getContentLocaleLabel(contentLocale)
  const Flag = CONTENT_LOCALE_FLAGS[contentLocale]

  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <Flag aria-hidden="true" className="size-3.5 shrink-0 rounded-sm" />
      {showLabel ? <span aria-hidden="true">{label}</span> : null}
      <span className="sr-only">
        {m.meme_audio_language({ language: label })}
      </span>
    </span>
  )
}
