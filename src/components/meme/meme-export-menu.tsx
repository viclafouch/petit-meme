import React from 'react'
import { AudioLines, Download, Film, Share2 } from 'lucide-react'
import { MemeFormatChip } from '~/components/meme/meme-format-chip'
import { PremiumBadge } from '~/components/premium/premium-badge'
import { useIsPremium } from '~/components/premium/use-is-premium'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

const MENU_ITEM_CLASS_NAME = 'py-2.5 md:py-1.5'

const FORMATS = {
  mp4: {
    icon: Film,
    label: m.meme_format_video,
    iconClassName: 'text-violet-600! dark:text-violet-400!'
  },
  mp3: {
    icon: AudioLines,
    label: m.meme_format_audio,
    iconClassName: 'text-emerald-600! dark:text-emerald-400!'
  }
} as const satisfies Record<
  MemeDerivedFormat,
  {
    icon: React.ElementType
    label: () => string
    iconClassName: string
  }
>

const MODES = {
  download: { icon: Download, label: m.meme_download },
  share: { icon: Share2, label: m.meme_share }
} as const satisfies Record<
  MemeExportMode,
  { icon: React.ElementType; label: () => string }
>

type MemeExportMenuItemsProps = {
  onExport: (format: MemeDerivedFormat) => void
}

const MemeExportMenuItems = ({ onExport }: MemeExportMenuItemsProps) => {
  const isPremium = useIsPremium()

  return MEME_DERIVED_FORMATS.map((format) => {
    const isLocked = format === 'mp3' && !isPremium
    const { icon: FormatIcon, label, iconClassName } = FORMATS[format]

    return (
      <DropdownMenuItem
        key={format}
        className={cn(
          MENU_ITEM_CLASS_NAME,
          isLocked ? 'text-muted-foreground' : null
        )}
        onClick={() => {
          onExport(format)
        }}
      >
        <FormatIcon className={iconClassName} />
        {label()}
        <span className="ml-auto flex items-center gap-1.5 pl-4">
          <MemeFormatChip format={format} />
          {isLocked ? <PremiumBadge /> : null}
        </span>
      </DropdownMenuItem>
    )
  })
}

type MemeExportSubmenuProps = MemeExportMenuItemsProps & {
  mode: MemeExportMode
  className?: string
}

export const MemeExportSubmenu = ({
  mode,
  onExport,
  className
}: MemeExportSubmenuProps) => {
  const { icon: ModeIcon, label } = MODES[mode]

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(MENU_ITEM_CLASS_NAME, className)}>
        <ModeIcon />
        {label()}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <MemeExportMenuItems onExport={onExport} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

type MemeExportMenuProps = MemeExportMenuItemsProps & {
  render: React.ReactElement
  children: React.ReactNode
  align?: React.ComponentProps<typeof DropdownMenuContent>['align']
}

export const MemeExportMenu = ({
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
        <MemeExportMenuItems onExport={onExport} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
