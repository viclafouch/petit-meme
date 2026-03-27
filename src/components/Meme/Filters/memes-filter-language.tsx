import React from 'react'
import { Globe } from 'lucide-react'
import { CONTENT_LOCALE_FLAGS, FLAG_ICON_CLASS } from '~/components/icon/flags'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '~/components/ui/popover'
import type { MemeContentLocale } from '~/db/generated/prisma/enums'
import {
  FILTERABLE_CONTENT_LOCALES,
  getContentLocaleLabel,
  matchIsDefaultContentLocaleFilter
} from '~/helpers/i18n-content'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'

type MemesFilterLanguageProps = {
  contentLocales: MemeContentLocale[]
  onContentLocalesChange: (contentLocales: MemeContentLocale[]) => void
}

export const MemesFilterLanguage = React.memo(
  ({ contentLocales, onContentLocalesChange }: MemesFilterLanguageProps) => {
    const locale = getLocale()
    const isActive = !matchIsDefaultContentLocaleFilter(contentLocales, locale)

    const handleToggle = (
      contentLocale: MemeContentLocale,
      checked: boolean
    ) => {
      if (checked) {
        onContentLocalesChange([...contentLocales, contentLocale])
      } else {
        onContentLocalesChange(
          contentLocales.filter((cl) => {
            return cl !== contentLocale
          })
        )
      }
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button active={isActive} variant="outline">
            <Globe aria-hidden />
            {m.meme_filter_languages()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="flex flex-col gap-3">
            {FILTERABLE_CONTENT_LOCALES.map((contentLocale) => {
              const isChecked = contentLocales.includes(contentLocale)
              const isLastChecked = isChecked && contentLocales.length === 1
              const Flag = CONTENT_LOCALE_FLAGS[contentLocale]

              return (
                <label
                  key={contentLocale}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isLastChecked}
                    onCheckedChange={(checked) => {
                      handleToggle(contentLocale, checked === true)
                    }}
                  />
                  <span className="flex items-center gap-1.5 text-sm">
                    {Flag ? <Flag className={FLAG_ICON_CLASS} /> : null}
                    {getContentLocaleLabel(contentLocale)}
                  </span>
                </label>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)
