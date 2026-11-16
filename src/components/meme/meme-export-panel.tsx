import React from 'react'
import { Clapperboard, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { MessagingAppIcon } from '~/components/icon/messaging-app-icon'
import {
  MEME_FORMAT_DISPLAY,
  MEME_FORMAT_EXPORT_LABELS,
  SHEET_BODY_CLASS_NAME,
  SHEET_HEADER_CLASS_NAME
} from '~/components/meme/meme-sheet'
import { PremiumLockBadge } from '~/components/premium/premium-lock-badge'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { Badge } from '~/components/ui/badge'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger
} from '~/components/ui/popover'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import { MESSAGING_APPS } from '~/constants/messaging-apps'
import { formatClockDuration } from '~/helpers/duration'
import { subscribeToNothing } from '~/helpers/external-store'
import { useActionAfterClose } from '~/hooks/use-action-after-close'
import { useIsCoarsePointer } from '~/hooks/use-is-coarse-pointer'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'
import { matchCanShareFiles } from '~/lib/download'
import { buildUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { recordMemeExport } from '~/server/meme/meme.functions'

const FORMAT_ROW_HOVER_ICONS = {
  mp4: Clapperboard,
  mp3: null
} as const satisfies Record<MemeDerivedFormat, React.ElementType | null>

const FORMAT_ROW_CLASS_NAME =
  'group/row flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl bg-secondary py-2.5 pr-3 pl-2.5 text-start touch-tap outline-none transition-[background-color,scale] duration-150 ease-out [--format-from:var(--color-violet-400)] [--format-to:var(--color-violet-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 data-[format=mp3]:[--format-from:var(--color-emerald-400)] data-[format=mp3]:[--format-to:var(--color-emerald-600)] enabled:active:scale-[0.98] mouse:enabled:hover:bg-[color-mix(in_oklab,var(--secondary),var(--format-from)_16%)] mouse:enabled:focus-visible:bg-[color-mix(in_oklab,var(--secondary),var(--format-from)_16%)]'

const FORMAT_ROW_ICON_CLASS_NAME =
  'grid size-11 shrink-0 place-items-center rounded-[0.8125rem] bg-linear-150 from-(--format-from) to-(--format-to) text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_6px_16px_-8px_var(--format-to)] [&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:size-5.5 [&>svg]:overflow-visible [&>svg]:transition-[opacity,scale] [&>svg]:duration-200 [&>svg]:ease-out'

const FORMAT_ROW_RESTING_ICON_CLASS_NAME =
  'mouse:group-hover/row:scale-80 mouse:group-hover/row:opacity-0 mouse:group-focus-visible/row:scale-80 mouse:group-focus-visible/row:opacity-0'

const FORMAT_ROW_HOVER_ICON_CLASS_NAME =
  'scale-80 opacity-0 mouse:group-hover/row:scale-100 mouse:group-hover/row:opacity-100 mouse:group-focus-visible/row:scale-100 mouse:group-focus-visible/row:opacity-100'

const recordShare = (memeId: string) => {
  void recordMemeExport({ data: { memeId, action: 'share' } })
}

const buildMemeUrl = (memeId: string) => {
  return buildUrl(`/memes/${memeId}`, getLocale())
}

const getServerCanShareFilesSnapshot = () => {
  return true
}

const useCanShareFiles = () => {
  return React.useSyncExternalStore(
    subscribeToNothing,
    matchCanShareFiles,
    getServerCanShareFilesSnapshot
  )
}

type FormatDetailParams = {
  format: MemeDerivedFormat
  isPremium: boolean
}

const getFormatDetail = ({ format, isPremium }: FormatDetailParams) => {
  if (format === 'mp3') {
    return m.meme_export_sound_detail()
  }

  return isPremium
    ? m.meme_export_video_detail_original()
    : m.meme_export_video_detail_watermarked()
}

type FormatRowsProps = {
  mode: MemeExportMode
  isPending: boolean
  onSelect: (format: MemeDerivedFormat) => void
}

const FormatRows = ({ mode, isPending, onSelect }: FormatRowsProps) => {
  const isPremium = useIsPremium()

  return (
    <div className="flex flex-col gap-1.5">
      {MEME_DERIVED_FORMATS.map((format) => {
        const FormatIcon = MEME_FORMAT_DISPLAY[format].icon
        const HoverIcon = FORMAT_ROW_HOVER_ICONS[format]
        const isLocked = format === 'mp3' && !isPremium

        return (
          <button
            key={format}
            type="button"
            disabled={isPending}
            data-format={format}
            className={FORMAT_ROW_CLASS_NAME}
            onClick={() => {
              onSelect(format)
            }}
          >
            <span className={FORMAT_ROW_ICON_CLASS_NAME}>
              <FormatIcon
                aria-hidden="true"
                className={
                  HoverIcon ? FORMAT_ROW_RESTING_ICON_CLASS_NAME : undefined
                }
              />
              {HoverIcon ? (
                <HoverIcon
                  aria-hidden="true"
                  data-hover-icon=""
                  className={FORMAT_ROW_HOVER_ICON_CLASS_NAME}
                />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[0.9375rem] font-semibold">
                {MEME_FORMAT_EXPORT_LABELS[mode][format]()}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {getFormatDetail({ format, isPremium })}
              </span>
            </span>
            {isLocked ? <PremiumLockBadge /> : null}
          </button>
        )
      })}
    </div>
  )
}

type CopyLinkFieldProps = {
  meme: MemeWithVideo
  onDone: () => void
}

const CopyLinkField = ({ meme, onDone }: CopyLinkFieldProps) => {
  const memeUrl = buildMemeUrl(meme.id)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(memeUrl)
      toast.success(m.meme_link_copied())
      onDone()
    } catch {
      toast.error(m.meme_link_copy_error())
    }
  }

  const handleCopyLink = () => {
    recordShare(meme.id)
    void copyLink()
  }

  return (
    <button
      type="button"
      className="flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-[0.875rem] bg-secondary py-1.5 pr-1.5 pl-3 text-start text-[0.8125rem] touch-tap outline-none transition-[background-color,scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] mouse:hover:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_6%)]"
      onClick={handleCopyLink}
    >
      <Link2
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {memeUrl.replace(/^https?:\/\//u, '')}
      </span>
      <span className="shrink-0 rounded-[0.625rem] bg-background px-3 py-2 font-semibold shadow-xs">
        {m.meme_copy_link()}
      </span>
    </button>
  )
}

type ShareDescriptionParams = {
  canShareFiles: boolean
  isCoarsePointer: boolean
}

const getShareDescription = ({
  canShareFiles,
  isCoarsePointer
}: ShareDescriptionParams) => {
  if (!isCoarsePointer) {
    return m.meme_share_link_on_computer()
  }

  return canShareFiles
    ? m.meme_share_apps_on_phone()
    : m.meme_share_downloads_instead()
}

type HeadingSlotProps = {
  className?: string
  children?: React.ReactNode
}

type MemeExportHeadingProps = {
  mode: MemeExportMode
  meme: MemeWithVideo
  Title: React.ComponentType<HeadingSlotProps>
  Description: React.ComponentType<HeadingSlotProps>
}

const HEADING_TITLE_CLASS_NAME = 'text-base leading-snug font-semibold'

const HEADING_DESCRIPTION_CLASS_NAME =
  'text-sm text-pretty text-muted-foreground'

const MemeExportHeading = ({
  mode,
  meme,
  Title,
  Description
}: MemeExportHeadingProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const canShareFiles = useCanShareFiles()

  if (mode === 'share') {
    return (
      <div className="flex flex-col gap-3 text-start">
        <span
          aria-hidden="true"
          className="flex -space-x-1.5 *:ring-3 *:ring-popover"
        >
          {MESSAGING_APPS.map((app) => {
            return (
              <MessagingAppIcon key={app.id} app={app} className="size-8.5" />
            )
          })}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <Title className={HEADING_TITLE_CLASS_NAME}>
            {m.meme_share_heading()}
          </Title>
          <Description className={HEADING_DESCRIPTION_CLASS_NAME}>
            {getShareDescription({ canShareFiles, isCoarsePointer })}
          </Description>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-start">
      <span className="relative aspect-video w-26 shrink-0 overflow-hidden rounded-[0.625rem] bg-black ring-1 ring-border">
        <img
          src={buildVideoImageUrl(meme.video.bunnyId)}
          alt=""
          decoding="async"
          className="size-full object-contain"
        />
        <Badge
          variant="black"
          size="sm"
          className="absolute right-1 bottom-1 font-semibold tabular-nums"
        >
          {formatClockDuration(meme.video.duration, getLocale())}
        </Badge>
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <Title className={HEADING_TITLE_CLASS_NAME}>{m.meme_download()}</Title>
        <Description className={HEADING_DESCRIPTION_CLASS_NAME}>
          {isCoarsePointer
            ? m.meme_export_saves_to_phone()
            : m.meme_export_saves_to_computer()}
        </Description>
      </div>
    </div>
  )
}

type MemeExportSheetHeaderProps = {
  mode: MemeExportMode
  meme: MemeWithVideo
}

export const MemeExportSheetHeader = ({
  mode,
  meme
}: MemeExportSheetHeaderProps) => {
  return (
    <DrawerHeader className={SHEET_HEADER_CLASS_NAME}>
      <MemeExportHeading
        mode={mode}
        meme={meme}
        Title={DrawerTitle}
        Description={DrawerDescription}
      />
    </DrawerHeader>
  )
}

type MemeExportPanelBodyProps = {
  mode: MemeExportMode
  meme: MemeWithVideo
  isPending: boolean
  onSelectFormat: (format: MemeDerivedFormat) => void
  onDone: () => void
}

export const MemeExportPanelBody = ({
  mode,
  meme,
  isPending,
  onSelectFormat,
  onDone
}: MemeExportPanelBodyProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const rows = (
    <FormatRows mode={mode} isPending={isPending} onSelect={onSelectFormat} />
  )

  if (mode === 'download') {
    return rows
  }

  if (!isCoarsePointer) {
    return <CopyLinkField meme={meme} onDone={onDone} />
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows}
      <CopyLinkField meme={meme} onDone={onDone} />
    </div>
  )
}

const useMemeExportSelection = (
  onExport: (format: MemeDerivedFormat) => void,
  onClose: () => void
) => {
  const isPremium = useIsPremium()
  const { runAfterClose, handleOpenChangeComplete } = useActionAfterClose()

  const handleSelectFormat = (format: MemeDerivedFormat) => {
    if (isPremium) {
      onExport(format)
    } else {
      runAfterClose(() => {
        onExport(format)
      })
    }

    onClose()
  }

  return { handleSelectFormat, handleOpenChangeComplete }
}

type MemeExportPanelProps = {
  mode: MemeExportMode
  meme: MemeWithVideo
  isPending: boolean
  onExport: (format: MemeDerivedFormat) => void
  render: React.ReactElement
  children: React.ReactNode
  align?: React.ComponentProps<typeof PopoverContent>['align']
}

export const MemeExportPanel = ({
  mode,
  meme,
  isPending,
  onExport,
  render,
  children,
  align = 'end'
}: MemeExportPanelProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const [isOpen, setIsOpen] = React.useState(false)

  const handleClose = () => {
    setIsOpen(false)
  }

  const { handleSelectFormat, handleOpenChangeComplete } =
    useMemeExportSelection(onExport, handleClose)
  const body = (
    <MemeExportPanelBody
      mode={mode}
      meme={meme}
      isPending={isPending}
      onSelectFormat={handleSelectFormat}
      onDone={handleClose}
    />
  )

  if (isCoarsePointer) {
    return (
      <Drawer
        showSwipeHandle
        open={isOpen}
        onOpenChange={setIsOpen}
        onOpenChangeComplete={handleOpenChangeComplete}
      >
        <DrawerTrigger render={render}>{children}</DrawerTrigger>
        <DrawerContent>
          <MemeExportSheetHeader mode={mode} meme={meme} />
          <div className={SHEET_BODY_CLASS_NAME}>{body}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <PopoverTrigger render={render}>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-88 max-w-[calc(100vw-2rem)] gap-4 rounded-2xl p-4"
      >
        <MemeExportHeading
          mode={mode}
          meme={meme}
          Title={PopoverTitle}
          Description={PopoverDescription}
        />
        {body}
      </PopoverContent>
    </Popover>
  )
}
