import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  type MemeContentLocale,
  MemeContentLocale as MemeContentLocaleEnum
} from '@/db/generated/prisma/enums'
import {
  CONTENT_LOCALE_META,
  getContentLocaleLabel
} from '@/helpers/i18n-content'

const CONTENT_LOCALE_OPTIONS = Object.values(MemeContentLocaleEnum)

type MemesFilterContentLocaleParams = {
  contentLocale: MemeContentLocale | null
  onContentLocaleChange: (contentLocale: MemeContentLocale | null) => void
}

export const MemesFilterContentLocale = React.memo(
  ({
    contentLocale,
    onContentLocaleChange
  }: MemesFilterContentLocaleParams) => {
    const handleChange = (value: string) => {
      onContentLocaleChange(
        value === 'all' ? null : (value as MemeContentLocale)
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button active={contentLocale !== null} variant="outline">
            Filtrer par langue
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          <DropdownMenuRadioGroup
            value={contentLocale || 'all'}
            onValueChange={handleChange}
          >
            <DropdownMenuRadioItem value="all">Tous</DropdownMenuRadioItem>
            {CONTENT_LOCALE_OPTIONS.map((cl) => {
              return (
                <DropdownMenuRadioItem key={cl} value={cl}>
                  {CONTENT_LOCALE_META[cl].flag} {getContentLocaleLabel(cl)}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)
