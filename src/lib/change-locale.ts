import { LOCALE_BANNER_DISMISSAL } from '~/constants/banner'
import { dismissBanner } from '~/lib/banner-dismissal'
import { getLocale, setLocale, type Locale } from '~/paraglide/runtime'
import { updateUserLocale } from '~/server/user/user.functions'

export const changeLocale = (locale: Locale) => {
  if (locale === getLocale()) {
    return
  }

  void updateUserLocale({ data: { locale } })
  dismissBanner(LOCALE_BANNER_DISMISSAL)
  void setLocale(locale)
}
