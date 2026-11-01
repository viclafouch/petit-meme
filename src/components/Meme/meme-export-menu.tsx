import React from 'react'
import { AudioLines, Download, Film, Share2 } from 'lucide-react'
import { PremiumBadge } from '~/components/premium-badge'
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
import { useIsPremium } from '~/hooks/use-is-premium'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

const MENU_ITEM_CLASS_NAME = 'py-2.5 md:py-1.5'

const FORMATS = {
  mp4: {
    icon: Film,
    label: m.meme_format_video,
    iconClassName: 'text-violet-600! dark:text-violet-400!',
    chipClassName:
      'bg-violet-500/15 text-violet-700! ring-violet-500/30 dark:text-violet-300!'
  },
  mp3: {
    icon: AudioLines,
    label: m.meme_format_audio,
    iconClassName: 'text-emerald-600! dark:text-emerald-400!',
    chipClassName:
      'bg-emerald-500/15 text-emerald-700! ring-emerald-500/30 dark:text-emerald-300!'
  }
} as const satisfies Record<
  MemeDerivedFormat,
  {
    icon: React.ElementType
    label: () => string
    iconClassName: string
    chipClassName: string
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
    const {
      icon: FormatIcon,
      label,
      iconClassName,
      chipClassName
    } = FORMATS[format]

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
          <span
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-xs font-semibold uppercase ring-1 ring-inset',
              chipClassName
            )}
          >
            {format}
          </span>
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
