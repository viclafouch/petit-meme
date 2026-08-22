import { localizeUrl } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'
import { E2E_BASE_URL } from './env'

export const localizePathname = (pathname: string, locale: Locale) => {
  return localizeUrl(new URL(pathname, E2E_BASE_URL), { locale }).pathname
}
