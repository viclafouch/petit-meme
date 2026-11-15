import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '~/components/icon/flags'
import { AuroraBanner } from '~/components/layout/aurora-banner'
import { BannerCloseButton } from '~/components/layout/banner-close-button'
import { getLocaleDisplayName } from '~/helpers/locale'
import { changeLocale } from '~/lib/change-locale'
import { m } from '~/paraglide/messages'
import { type Locale, getLocale } from '~/paraglide/runtime'

type LocaleBannerProps = {
  suggestedLocale: Locale
  onDismiss: () => void
}

export const LocaleBanner = ({
  suggestedLocale,
  onDismiss
}: LocaleBannerProps) => {
  const displayName = getLocaleDisplayName(suggestedLocale, getLocale())
  const SuggestedFlag = LOCALE_FLAGS[suggestedLocale]

  const handleSwitch = () => {
    changeLocale(suggestedLocale)
  }

  return (
    <AuroraBanner>
      <div className="flex w-full items-center justify-center gap-2 px-10 text-foreground sm:gap-3">
        <SuggestedFlag className={FLAG_ICON_CLASS} />
        <span className="text-xs sm:text-sm">
          {m.locale_banner_available({ language: displayName })}
        </span>
        <button
          type="button"
          onClick={handleSwitch}
          className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background transition-opacity hover:opacity-80"
        >
          {m.locale_banner_switch({ language: displayName })}
        </button>
      </div>
      <BannerCloseButton onClick={onDismiss} />
    </AuroraBanner>
  )
}
