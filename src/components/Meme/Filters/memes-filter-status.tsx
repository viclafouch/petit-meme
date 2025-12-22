import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MemeStatus } from '@/db/generated/prisma/enums'

export const MemesFilterStatus = React.memo(
  ({
    status,
    onStatusChange
  }: {
    status: MemeStatus | null
    onStatusChange: (status: MemeStatus | null) => void
  }) => {
    const handleChange = (value: string) => {
      onStatusChange(value === 'all' ? null : (value as MemeStatus))
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button active={status !== null} variant="outline">
            Filtrer par statut
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-36">
          <DropdownMenuRadioGroup
            value={status || 'all'}
            onValueChange={handleChange}
          >
            <DropdownMenuRadioItem value="all" key="all">
              Tous
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={MemeStatus.PUBLISHED} key="published">
              Publiés
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={MemeStatus.PENDING}>
              En attente
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={MemeStatus.REJECTED}>
              Rejetés
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={MemeStatus.ARCHIVED}>
              Archivés
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)
