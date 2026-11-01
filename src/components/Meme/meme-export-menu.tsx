import React from 'react'
import { AudioLines, Film } from 'lucide-react'
import { PremiumBadge } from '~/components/premium-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { useIsPremium } from '~/hooks/use-is-premium'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

const FORMAT_ICONS = {
  mp4: Film,
  mp3: AudioLines
} as const satisfies Record<MemeDerivedFormat, React.ElementType>

const FORMAT_LABELS = {
  download: {
    mp4: m.meme_download_video,
    mp3: m.meme_download_audio
  },
  share: {
    mp4: m.meme_share_video,
    mp3: m.meme_share_audio
  }
} as const satisfies Record<
  MemeExportMode,
  Record<MemeDerivedFormat, () => string>
>

type MemeExportMenuItemsProps = {
  mode: MemeExportMode
  onExport: (format: MemeDerivedFormat) => void
}

export const MemeExportMenuItems = ({
  mode,
  onExport
}: MemeExportMenuItemsProps) => {
  const isPremium = useIsPremium()

  return MEME_DERIVED_FORMATS.map((format) => {
    const isLocked = format === 'mp3' && !isPremium
    const FormatIcon = FORMAT_ICONS[format]

    return (
      <DropdownMenuItem
        key={format}
        className={cn(
          'py-2.5 md:py-1.5',
          isLocked ? 'text-muted-foreground' : null
        )}
        onClick={() => {
          onExport(format)
        }}
      >
        <FormatIcon />
        {FORMAT_LABELS[mode][format]()}
        {isLocked ? (
          <PremiumBadge className="ml-auto" />
        ) : (
          <DropdownMenuShortcut className="pl-4 uppercase">
            {format}
          </DropdownMenuShortcut>
        )}
      </DropdownMenuItem>
    )
  })
}

type MemeExportMenuProps = MemeExportMenuItemsProps & {
  render: React.ReactElement
  children: React.ReactNode
  align?: React.ComponentProps<typeof DropdownMenuContent>['align']
}

export const MemeExportMenu = ({
  mode,
  onExport,
  render,
  children,
  align = 'center'
}: MemeExportMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={render}>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-auto min-w-(--anchor-width)"
      >
        <MemeExportMenuItems mode={mode} onExport={onExport} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
