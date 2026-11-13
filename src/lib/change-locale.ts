import { dismissLocaleBanner } from '~/lib/locale-banner'
import { getLocale, setLocale, type Locale } from '~/paraglide/runtime'
import { updateUserLocale } from '~/server/user/user.functions'

export const changeLocale = (locale: Locale) => {
  if (locale === getLocale()) {
    return
  }

  void updateUserLocale({ data: { locale } })
  dismissLocaleBanner()
  void setLocale(locale)
}
