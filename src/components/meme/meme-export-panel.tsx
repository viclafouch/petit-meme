import React from 'react'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { MessagingAppIcon } from '~/components/icon/messaging-app-icon'
import {
  MEME_EXPORT_MODE_DISPLAY,
  MEME_FORMAT_DISPLAY,
  SHEET_BODY_CLASS_NAME,
  SHEET_HEADER_CLASS_NAME,
  SHEET_TITLE_CLASS_NAME
} from '~/components/meme/meme-sheet'
import { PremiumBadge } from '~/components/premium/premium-badge'
import { useIsPremium } from '~/components/premium/use-is-premium'
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
import { MESSAGING_APPS, type MessagingApp } from '~/constants/messaging-apps'
import { useActionAfterClose } from '~/hooks/use-action-after-close'
import { useIsCoarsePointer } from '~/hooks/use-is-coarse-pointer'
import { buildUrl } from '~/lib/seo/url'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { recordMemeExport } from '~/server/meme/meme.functions'

const SHARE_URL_BUILDERS: Partial<
  Record<MessagingApp['id'], (url: string, title: string) => string>
> = {
  whatsapp: (url, title) => {
    return `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`
  },
  telegram: (url, title) => {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  messenger: (url) => {
    return `fb-messenger://share/?link=${encodeURIComponent(url)}`
  }
}

const PHONE_ONLY_SHARE_APP_IDS = new Set<MessagingApp['id']>(['messenger'])

const FORMAT_TILE_TINTS = {
  mp4: 'bg-violet-500/15',
  mp3: 'bg-emerald-500/15'
} as const satisfies Record<MemeDerivedFormat, string>

const SECTION_HEADING_CLASS_NAME = 'text-xs font-medium text-muted-foreground'

const APP_TILE_CLASS_NAME =
  'flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-1 text-xs font-medium touch-tap select-none outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:transition-transform [&>svg]:duration-100 active:[&>svg]:scale-[0.94]'

const recordShare = (memeId: string) => {
  void recordMemeExport({ data: { memeId, action: 'share' } })
}

const buildMemeUrl = (memeId: string) => {
  return buildUrl(`/memes/${memeId}`, getLocale())
}

type FormatTilesProps = {
  isPending: boolean
  onSelect: (format: MemeDerivedFormat) => void
}

const FormatTiles = ({ isPending, onSelect }: FormatTilesProps) => {
  const isPremium = useIsPremium()

  return (
    <div className="grid grid-cols-2 gap-3">
      {MEME_DERIVED_FORMATS.map((format) => {
        const {
          icon: FormatIcon,
          label,
          iconClassName
        } = MEME_FORMAT_DISPLAY[format]
        const isLocked = format === 'mp3' && !isPremium

        return (
          <button
            key={format}
            type="button"
            disabled={isPending}
            className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-secondary px-3 py-4 touch-tap select-none transition-[background-color,scale] duration-100 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:opacity-50 pointer-fine:hover:bg-muted"
            onClick={() => {
              onSelect(format)
            }}
          >
            <span
              className={cn(
                'grid size-12 place-items-center rounded-full',
                FORMAT_TILE_TINTS[format]
              )}
            >
              <FormatIcon
                aria-hidden="true"
                className={cn('size-6', iconClassName)}
              />
            </span>
            <span className="text-base font-semibold">{label()}</span>
            <span className="flex h-5 items-center gap-1.5">
              <span className="font-mono text-xs text-muted-foreground uppercase">
                {format}
              </span>
              {isLocked ? <PremiumBadge /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

type ShareAppProps = {
  app: MessagingApp
  meme: MemeWithVideo
  onDone: () => void
}

const ShareApp = ({ app, meme, onDone }: ShareAppProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const memeUrl = buildMemeUrl(meme.id)
  const buildShareUrl = SHARE_URL_BUILDERS[app.id]
  const shareUrl =
    buildShareUrl && (isCoarsePointer || !PHONE_ONLY_SHARE_APP_IDS.has(app.id))
      ? buildShareUrl(memeUrl, meme.title)
      : null

  const copyLinkForApp = async () => {
    try {
      await navigator.clipboard.writeText(memeUrl)
      toast.success(m.meme_share_link_copied_for_app({ app: app.name }))
    } catch {
      toast.error(m.meme_link_copy_error())
    }
  }

  const handleOpenApp = () => {
    recordShare(meme.id)
    onDone()
  }

  const handleCopyForApp = () => {
    handleOpenApp()
    void copyLinkForApp()
  }

  const content = (
    <>
      <MessagingAppIcon app={app} className="size-12" />
      <span className="max-w-full truncate">{app.name}</span>
    </>
  )

  if (shareUrl) {
    return (
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={APP_TILE_CLASS_NAME}
        onClick={handleOpenApp}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={APP_TILE_CLASS_NAME}
      onClick={handleCopyForApp}
    >
      {content}
    </button>
  )
}

type ShareLinkProps = {
  meme: MemeWithVideo
  onDone: () => void
}

const ShareLink = ({ meme, onDone }: ShareLinkProps) => {
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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-x-2 gap-y-4">
        {MESSAGING_APPS.map((app) => {
          return <ShareApp key={app.id} app={app} meme={meme} onDone={onDone} />
        })}
      </div>
      <button
        type="button"
        className="flex min-h-12 w-full min-w-0 items-center gap-2 rounded-xl bg-secondary py-1.5 pr-1.5 pl-3 text-left text-sm touch-tap outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={handleCopyLink}
      >
        <Link2
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {memeUrl.replace(/^https?:\/\//u, '')}
        </span>
        <span className="shrink-0 rounded-lg bg-background px-3 py-2 font-semibold shadow-xs">
          {m.meme_copy()}
        </span>
      </button>
      <p className="text-xs text-muted-foreground">
        {m.meme_share_link_hint()}
      </p>
    </div>
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

  if (mode === 'download') {
    return <FormatTiles isPending={isPending} onSelect={onSelectFormat} />
  }

  if (!isCoarsePointer) {
    return <ShareLink meme={meme} onDone={onDone} />
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className={SECTION_HEADING_CLASS_NAME}>
          {m.meme_share_file_heading()}
        </h3>
        <FormatTiles isPending={isPending} onSelect={onSelectFormat} />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className={SECTION_HEADING_CLASS_NAME}>
          {m.meme_share_link_heading()}
        </h3>
        <ShareLink meme={meme} onDone={onDone} />
      </section>
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
  const title = MEME_EXPORT_MODE_DISPLAY[mode].label()
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
          <DrawerHeader className={SHEET_HEADER_CLASS_NAME}>
            <DrawerTitle className={SHEET_TITLE_CLASS_NAME}>
              {title}
            </DrawerTitle>
            <DrawerDescription className="line-clamp-1">
              {meme.title}
            </DrawerDescription>
          </DrawerHeader>
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
        <div className="flex min-w-0 flex-col gap-0.5">
          <PopoverTitle className="text-base font-semibold">
            {title}
          </PopoverTitle>
          <PopoverDescription className="truncate text-sm">
            {meme.title}
          </PopoverDescription>
        </div>
        {body}
      </PopoverContent>
    </Popover>
  )
}
