import React from 'react'
import { CONTENT_LOCALE_FLAGS, FLAG_ICON_CLASS } from '~/components/icon/flags'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import {
  type MemeContentLocale,
  MemeContentLocale as MemeContentLocaleEnum
} from '~/db/generated/prisma/enums'
import {
  getContentLocaleLabel,
  matchIsMemeContentLocale
} from '~/helpers/i18n-content'

const CONTENT_LOCALE_OPTIONS = Object.values(MemeContentLocaleEnum)

type MemesFilterContentLocaleProps = {
  contentLocale: MemeContentLocale | null
  onContentLocaleChange: (contentLocale: MemeContentLocale | null) => void
}

export const MemesFilterContentLocale = React.memo(
  ({ contentLocale, onContentLocaleChange }: MemesFilterContentLocaleProps) => {
    const handleChange = (value: string) => {
      if (value === 'all') {
        onContentLocaleChange(null)

        return
      }

      if (matchIsMemeContentLocale(value)) {
        onContentLocaleChange(value)
      }
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button active={contentLocale !== null} variant="outline" />}
        >
          Filtrer par langue
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          <DropdownMenuRadioGroup
            value={contentLocale ?? 'all'}
            onValueChange={handleChange}
          >
            <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
            {CONTENT_LOCALE_OPTIONS.map((cl) => {
              const Flag = CONTENT_LOCALE_FLAGS[cl]

              return (
                <DropdownMenuRadioItem key={cl} value={cl}>
                  <span className="flex items-center gap-1.5">
                    {Flag ? <Flag className={FLAG_ICON_CLASS} /> : null}
                    {getContentLocaleLabel(cl)}
                  </span>
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)
