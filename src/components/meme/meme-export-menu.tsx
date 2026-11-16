import { MemeFormatChip } from '~/components/meme/meme-format-chip'
import {
  MEME_EXPORT_MODE_DISPLAY,
  MEME_FORMAT_DISPLAY,
  MEME_FORMAT_EXPORT_LABELS
} from '~/components/meme/meme-sheet'
import { PremiumLockBadge } from '~/components/premium/premium-lock-badge'
import { useIsPremium } from '~/components/premium/use-is-premium'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '~/components/ui/dropdown-menu'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { cn } from '~/lib/utils'

const MENU_ITEM_CLASS_NAME = 'py-2.5 md:py-1.5'

const matchIsFormatLocked = (format: MemeDerivedFormat, isPremium: boolean) => {
  return format === 'mp3' && !isPremium
}

type FormatContentProps = {
  mode: MemeExportMode
  format: MemeDerivedFormat
  isLocked: boolean
}

const FormatContent = ({ mode, format, isLocked }: FormatContentProps) => {
  const { icon: FormatIcon, iconClassName } = MEME_FORMAT_DISPLAY[format]

  return (
    <>
      <FormatIcon className={iconClassName} />
      {MEME_FORMAT_EXPORT_LABELS[mode][format]()}
      <span className="ml-auto flex items-center gap-1.5 pl-4">
        <MemeFormatChip format={format} />
        {isLocked ? <PremiumLockBadge /> : null}
      </span>
    </>
  )
}

type MemeExportMenuItemsProps = {
  mode: MemeExportMode
  onExport: (format: MemeDerivedFormat) => void
}

const MemeExportMenuItems = ({ mode, onExport }: MemeExportMenuItemsProps) => {
  const isPremium = useIsPremium()

  return MEME_DERIVED_FORMATS.map((format) => {
    const isLocked = matchIsFormatLocked(format, isPremium)

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
        <FormatContent mode={mode} format={format} isLocked={isLocked} />
      </DropdownMenuItem>
    )
  })
}

type MemeExportSubmenuProps = MemeExportMenuItemsProps & {
  className?: string
}

export const MemeExportSubmenu = ({
  mode,
  onExport,
  className
}: MemeExportSubmenuProps) => {
  const { icon: ModeIcon, label } = MEME_EXPORT_MODE_DISPLAY[mode]

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(MENU_ITEM_CLASS_NAME, className)}>
        <ModeIcon />
        {label()}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <MemeExportMenuItems mode={mode} onExport={onExport} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
