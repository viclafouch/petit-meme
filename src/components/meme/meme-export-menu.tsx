import React from 'react'
import { AudioLines, Film } from 'lucide-react'
import { MemeFormatChip } from '~/components/meme/meme-format-chip'
import {
  MEME_EXPORT_MODE_DISPLAY,
  SHEET_BODY_CLASS_NAME,
  SHEET_HEADER_CLASS_NAME,
  SHEET_TILE_CLASS_NAME,
  SHEET_TITLE_CLASS_NAME
} from '~/components/meme/meme-sheet'
import { PremiumBadge } from '~/components/premium/premium-badge'
import { useIsPremium } from '~/components/premium/use-is-premium'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer'
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
import { useActionAfterClose } from '~/hooks/use-action-after-close'
import { useIsCoarsePointer } from '~/hooks/use-is-coarse-pointer'
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

const matchIsFormatLocked = (format: MemeDerivedFormat, isPremium: boolean) => {
  return format === 'mp3' && !isPremium
}

type FormatContentProps = {
  format: MemeDerivedFormat
  isLocked: boolean
}

const FormatContent = ({ format, isLocked }: FormatContentProps) => {
  const { icon: FormatIcon, label, iconClassName } = FORMATS[format]

  return (
    <>
      <FormatIcon className={iconClassName} />
      {label()}
      <span className="ml-auto flex items-center gap-1.5 pl-4">
        <MemeFormatChip format={format} />
        {isLocked ? <PremiumBadge /> : null}
      </span>
    </>
  )
}

type MemeExportMenuItemsProps = {
  onExport: (format: MemeDerivedFormat) => void
}

const MemeExportMenuItems = ({ onExport }: MemeExportMenuItemsProps) => {
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
        <FormatContent format={format} isLocked={isLocked} />
      </DropdownMenuItem>
    )
  })
}

type MemeExportFormatTilesProps = {
  onSelect: (format: MemeDerivedFormat) => void
}

export const MemeExportFormatTiles = ({
  onSelect
}: MemeExportFormatTilesProps) => {
  const isPremium = useIsPremium()

  return (
    <div className="grid grid-cols-2 gap-3">
      {MEME_DERIVED_FORMATS.map((format) => {
        const { icon: FormatIcon, label, iconClassName } = FORMATS[format]
        const isLocked = matchIsFormatLocked(format, isPremium)

        return (
          <DrawerClose
            key={format}
            className={SHEET_TILE_CLASS_NAME}
            onClick={() => {
              onSelect(format)
            }}
          >
            <FormatIcon className={cn('size-8', iconClassName)} />
            <span className="text-base font-semibold">{label()}</span>
            <span className="flex h-6 items-center gap-1.5">
              <span className="font-mono text-xs text-muted-foreground uppercase">
                {format}
              </span>
              {isLocked ? <PremiumBadge /> : null}
            </span>
          </DrawerClose>
        )
      })}
    </div>
  )
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
  const { icon: ModeIcon, label } = MEME_EXPORT_MODE_DISPLAY[mode]

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
  mode: MemeExportMode
  memeTitle: string
  render: React.ReactElement
  children: React.ReactNode
  align?: React.ComponentProps<typeof DropdownMenuContent>['align']
}

type MemeExportSheetProps = Omit<MemeExportMenuProps, 'align'>

const MemeExportSheet = ({
  mode,
  memeTitle,
  onExport,
  render,
  children
}: MemeExportSheetProps) => {
  const isPremium = useIsPremium()
  const { runAfterClose, handleOpenChangeComplete } = useActionAfterClose()

  return (
    <Drawer showSwipeHandle onOpenChangeComplete={handleOpenChangeComplete}>
      <DrawerTrigger render={render}>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className={SHEET_HEADER_CLASS_NAME}>
          <DrawerTitle className={SHEET_TITLE_CLASS_NAME}>
            {MEME_EXPORT_MODE_DISPLAY[mode].label()}
          </DrawerTitle>
          <DrawerDescription className="line-clamp-1">
            {memeTitle}
          </DrawerDescription>
        </DrawerHeader>
        <div className={SHEET_BODY_CLASS_NAME}>
          <MemeExportFormatTiles
            onSelect={(format) => {
              if (isPremium) {
                onExport(format)

                return
              }

              runAfterClose(() => {
                onExport(format)
              })
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export const MemeExportMenu = ({
  align = 'center',
  ...props
}: MemeExportMenuProps) => {
  const isCoarsePointer = useIsCoarsePointer()

  if (isCoarsePointer) {
    return <MemeExportSheet {...props} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={props.render}>
        {props.children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-auto min-w-(--anchor-width)"
      >
        <MemeExportMenuItems onExport={props.onExport} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
