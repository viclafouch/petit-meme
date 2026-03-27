import { Check } from 'lucide-react'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '~/components/icon/flags'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { getLocaleDisplayName } from '~/helpers/locale'
import { dismissLocaleBanner } from '~/lib/locale-banner'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { getLocale, locales, setLocale } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'
import { updateUserLocale } from '~/server/user-locale'

type LanguageSwitcherParams = {
  className?: string
}

export const LanguageSwitcher = ({ className }: LanguageSwitcherParams) => {
  const currentLocale = getLocale()
  const CurrentFlag = LOCALE_FLAGS[currentLocale]

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
          className={cn('gap-1.5 px-2 text-xs font-medium', className)}
        >
          <CurrentFlag className={FLAG_ICON_CLASS} />
          {currentLocale.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {locales.map((locale) => {
          const isActive = locale === currentLocale
          const Flag = LOCALE_FLAGS[locale]

          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => {
                handleLocaleChange(locale)
              }}
              className="justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <Flag className={FLAG_ICON_CLASS} />
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
