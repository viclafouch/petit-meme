import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getLocaleDisplayName, getLocaleFlag } from '@/helpers/locale'
import { dismissLocaleBanner } from '@/lib/locale-banner'
import { m } from '@/paraglide/messages.js'
import type { Locale } from '@/paraglide/runtime'
import { getLocale, locales, setLocale } from '@/paraglide/runtime'
import { updateUserLocale } from '@/server/user-locale'

export const LanguageSwitcher = () => {
  const currentLocale = getLocale()

  const handleLocaleChange = (locale: Locale) => {
    if (locale === currentLocale) {
      return
    }

    void updateUserLocale({ data: { locale } })
    dismissLocaleBanner()
    void setLocale(locale)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={m.nav_switch_language()}
          className="gap-1.5 px-2 text-xs font-medium"
        >
          <span className="text-sm" aria-hidden="true">
            {getLocaleFlag(currentLocale)}
          </span>
          {currentLocale.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {locales.map((locale) => {
          const isActive = locale === currentLocale

          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => {
                handleLocaleChange(locale)
              }}
              className="justify-between gap-3"
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base" aria-hidden="true">
                  {getLocaleFlag(locale)}
                </span>
                <span className="capitalize">
                  {getLocaleDisplayName(locale, locale)}
                </span>
              </span>
              {isActive ? (
                <Check className="size-3.5 text-primary" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
