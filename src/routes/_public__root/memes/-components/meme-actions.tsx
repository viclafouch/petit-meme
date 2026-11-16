import React from 'react'
import { Clapperboard, Download, Link2, Pencil, Send, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { MessagingAppIcon } from '~/components/icon/messaging-app-icon'
import {
  MEME_FORMAT_DISPLAY,
  SHEET_BODY_CLASS_NAME,
  SHEET_HEADER_CLASS_NAME,
  SHEET_TITLE_CLASS_NAME
} from '~/components/meme/meme-sheet'
import { useBookmarkAction } from '~/components/meme/use-bookmark-action'
import { PremiumBadge } from '~/components/premium/premium-badge'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { Button } from '~/components/ui/button'
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
  PopoverTrigger
} from '~/components/ui/popover'
import {
  RadioToggleGroup,
  RadioToggleGroupItem
} from '~/components/ui/radio-toggle-group'
import { MEME_DERIVED_FORMATS, type MemeDerivedFormat } from '~/constants/bunny'
import type { MemeWithVideo } from '~/constants/meme'
import { MESSAGING_APPS, type MessagingApp } from '~/constants/messaging-apps'
import { matchIsUserAdmin } from '~/helpers/role'
import { useIsCoarsePointer } from '~/hooks/use-is-coarse-pointer'
import { buildUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { recordMemeExport } from '~/server/meme/meme.functions'

const SHARE_AVATAR_APP_IDS = [
  'messenger',
  'instagram',
  'whatsapp'
] as const satisfies MessagingApp['id'][]

const SHARE_AVATAR_APPS = SHARE_AVATAR_APP_IDS.flatMap((appId) => {
  return MESSAGING_APPS.filter((app) => {
    return app.id === appId
  })
})

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

const SPARKLES = [
  { x: 0, y: -20, size: 9, delay: 0 },
  { x: 19, y: -11, size: 7, delay: 40 },
  { x: 16, y: 10, size: 8, delay: 80 },
  { x: 0, y: 21, size: 6, delay: 20 },
  { x: -17, y: 10, size: 8, delay: 60 },
  { x: -19, y: -11, size: 7, delay: 100 }
] as const

const SPARKLE_PATH =
  'M12 0c.6 5.4 1.8 9.6 12 12-10.2 2.4-11.4 6.6-12 12-.6-5.4-1.8-9.6-12-12C10.2 9.6 11.4 5.4 12 0Z'

const recordShare = (memeId: string) => {
  void recordMemeExport({ data: { memeId, action: 'share' } })
}

type ResponsivePanelProps = {
  title: string
  description: string
  triggerClassName: string
  triggerContent: React.ReactNode
  children: (close: () => void) => React.ReactNode
}

const ResponsivePanel = ({
  title,
  description,
  triggerClassName,
  triggerContent,
  children
}: ResponsivePanelProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const [isOpen, setIsOpen] = React.useState(false)

  const handleClose = () => {
    setIsOpen(false)
  }

  if (isCoarsePointer) {
    return (
      <Drawer showSwipeHandle open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger className={triggerClassName}>
          {triggerContent}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className={SHEET_HEADER_CLASS_NAME}>
            <DrawerTitle className={SHEET_TITLE_CLASS_NAME}>
              {title}
            </DrawerTitle>
            <DrawerDescription className="line-clamp-1">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <div className={SHEET_BODY_CLASS_NAME}>{children(handleClose)}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className={triggerClassName}>
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-88 gap-4 rounded-2xl p-4"
      >
        <p className="text-base font-semibold">{title}</p>
        {children(handleClose)}
      </PopoverContent>
    </Popover>
  )
}

const ShareAvatars = () => {
  return (
    <span className="meme-avatars" aria-hidden="true">
      {SHARE_AVATAR_APPS.map((app) => {
        return (
          <MessagingAppIcon
            key={app.id}
            app={app}
            className="size-6 rounded-full"
          />
        )
      })}
    </span>
  )
}

type ShareTargetProps = {
  app: MessagingApp
  meme: MemeWithVideo
  onShare: () => void
}

const ShareTarget = ({ app, meme, onShare }: ShareTargetProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const memeUrl = buildUrl(`/memes/${meme.id}`)
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

  const handleShareLink = () => {
    recordShare(meme.id)
    onShare()
  }

  const handleCopyForApp = () => {
    handleShareLink()
    void copyLinkForApp()
  }

  const content = (
    <>
      <MessagingAppIcon app={app} className="size-12" />
      <span>{app.name}</span>
    </>
  )

  if (shareUrl) {
    return (
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="meme-app"
        onClick={handleShareLink}
      >
        {content}
      </a>
    )
  }

  return (
    <button type="button" className="meme-app" onClick={handleCopyForApp}>
      {content}
    </button>
  )
}

type SharePanelProps = {
  meme: MemeWithVideo
  isSharing: boolean
  onShareVideo: () => void
  onDone: () => void
}

const SharePanel = ({
  meme,
  isSharing,
  onShareVideo,
  onDone
}: SharePanelProps) => {
  const isCoarsePointer = useIsCoarsePointer()
  const memeUrl = buildUrl(`/memes/${meme.id}`)

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

  const handleShareVideo = () => {
    onDone()
    onShareVideo()
  }

  return (
    <div className="flex flex-col gap-4">
      {isCoarsePointer ? (
        <Button
          size="xl"
          className="w-full rounded-full"
          disabled={isSharing}
          onClick={handleShareVideo}
        >
          <Send />
          {m.meme_send_video()}
        </Button>
      ) : null}
      <div className="grid grid-cols-3 gap-y-4">
        {MESSAGING_APPS.map((app) => {
          return (
            <ShareTarget key={app.id} app={app} meme={meme} onShare={onDone} />
          )
        })}
      </div>
      <button
        type="button"
        className="flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-3 text-left text-sm"
        onClick={handleCopyLink}
      >
        <Link2
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="truncate text-muted-foreground">
          {memeUrl.replace(/^https?:\/\//u, '')}
        </span>
        <span className="ml-auto font-semibold">{m.meme_copy()}</span>
      </button>
      <p className="text-xs text-muted-foreground">
        {m.meme_share_link_hint()}
      </p>
    </div>
  )
}

type DownloadPanelProps = {
  isDownloading: boolean
  onDownload: (format: MemeDerivedFormat) => void
  onDone: () => void
}

const DownloadPanel = ({
  isDownloading,
  onDownload,
  onDone
}: DownloadPanelProps) => {
  const isPremium = useIsPremium()
  const [format, setFormat] = React.useState<MemeDerivedFormat>('mp4')

  const handleDownload = () => {
    onDone()
    onDownload(format)
  }

  return (
    <div className="flex flex-col gap-3">
      <RadioToggleGroup<MemeDerivedFormat>
        value={format}
        onValueChange={setFormat}
        aria-label={m.meme_download()}
        className="w-full rounded-full bg-secondary p-1"
      >
        {MEME_DERIVED_FORMATS.map((formatKey) => {
          const {
            icon: FormatIcon,
            label,
            iconClassName
          } = MEME_FORMAT_DISPLAY[formatKey]

          return (
            <RadioToggleGroupItem
              key={formatKey}
              value={formatKey}
              className="h-10 gap-1.5 rounded-full! font-semibold data-checked:bg-background data-checked:shadow-sm"
            >
              <FormatIcon className={iconClassName} />
              {label()}
              {formatKey === 'mp3' && !isPremium ? <PremiumBadge /> : null}
            </RadioToggleGroupItem>
          )
        })}
      </RadioToggleGroup>
      <Button
        size="xl"
        className="w-full rounded-full"
        disabled={isDownloading}
        onClick={handleDownload}
      >
        <Download />
        {format === 'mp3' ? m.meme_download_sound() : m.meme_download_video()}
      </Button>
    </div>
  )
}

const Sparkles = () => {
  return SPARKLES.map((sparkle) => {
    return (
      <svg
        key={`${sparkle.x}:${sparkle.y}`}
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="meme-sparkle"
        style={{
          '--sparkle-x': `${sparkle.x}px`,
          '--sparkle-y': `${sparkle.y}px`,
          '--sparkle-delay': `${sparkle.delay}ms`,
          width: sparkle.size,
          height: sparkle.size
        }}
      >
        <path d={SPARKLE_PATH} fill="currentColor" />
      </svg>
    )
  })
}

type BookmarkPillProps = {
  meme: MemeWithVideo
}

const BookmarkPill = ({ meme }: BookmarkPillProps) => {
  const bookmark = useBookmarkAction({ meme })
  const [burstCount, setBurstCount] = React.useState(0)

  const handleBookmark = () => {
    if (!bookmark.isMemeBookmarked) {
      setBurstCount((count) => {
        return count + 1
      })
    }

    bookmark.selectBookmark()
  }

  return (
    <button
      type="button"
      className="meme-pill meme-pill-bookmark"
      aria-pressed={bookmark.isMemeBookmarked}
      disabled={bookmark.isPending}
      onClick={handleBookmark}
    >
      <span className="relative grid place-items-center">
        <Star aria-hidden="true" />
        {bookmark.isMemeBookmarked && burstCount > 0 ? (
          <span
            key={burstCount}
            className="absolute inset-0 grid place-items-center"
          >
            <Sparkles />
          </span>
        ) : null}
      </span>
      {bookmark.isMemeBookmarked ? m.meme_bookmarked() : m.meme_bookmark()}
    </button>
  )
}

type SignedInBookmarkPillProps = {
  meme: MemeWithVideo
}

const SignedInBookmarkPill = ({ meme }: SignedInBookmarkPillProps) => {
  useSuspenseQuery(listBookmarkedMemesQueryOpts())

  return <BookmarkPill meme={meme} />
}

const BookmarkPillPlaceholder = () => {
  return (
    <button type="button" className="meme-pill meme-pill-bookmark" disabled>
      <Star aria-hidden="true" />
      {m.meme_bookmark()}
    </button>
  )
}

type BookmarkButtonProps = {
  meme: MemeWithVideo
}

const BookmarkButton = ({ meme }: BookmarkButtonProps) => {
  const { user } = useRouteContext({ from: '__root__' })

  if (!user) {
    return <BookmarkPill meme={meme} />
  }

  return (
    <React.Suspense fallback={<BookmarkPillPlaceholder />}>
      <SignedInBookmarkPill meme={meme} />
    </React.Suspense>
  )
}

type MemeActionsProps = {
  meme: MemeWithVideo
  isSharing: boolean
  isDownloading: boolean
  onPause: () => void
  onShareVideo: () => void
  onDownload: (format: MemeDerivedFormat) => void
}

export const MemeActions = ({
  meme,
  isSharing,
  isDownloading,
  onPause,
  onShareVideo,
  onDownload
}: MemeActionsProps) => {
  const { user } = useRouteContext({ from: '__root__' })

  return (
    <div className="meme-actions -mx-4 px-4 lg:mx-0 lg:px-0">
      <ResponsivePanel
        title={m.meme_share()}
        description={meme.title}
        triggerClassName="meme-pill pl-2"
        triggerContent={
          <>
            <ShareAvatars />
            {m.meme_share()}
          </>
        }
      >
        {(close) => {
          return (
            <SharePanel
              meme={meme}
              isSharing={isSharing}
              onShareVideo={onShareVideo}
              onDone={close}
            />
          )
        }}
      </ResponsivePanel>
      <Link
        to="/memes/$memeId/studio"
        params={{ memeId: meme.id }}
        className="meme-pill meme-pill-studio"
        onClick={onPause}
      >
        <Clapperboard aria-hidden="true" />
        {m.meme_studio()}
      </Link>
      <ResponsivePanel
        title={m.meme_download()}
        description={meme.title}
        triggerClassName="meme-pill"
        triggerContent={
          <>
            <Download aria-hidden="true" />
            {m.meme_download()}
          </>
        }
      >
        {(close) => {
          return (
            <DownloadPanel
              isDownloading={isDownloading}
              onDownload={onDownload}
              onDone={close}
            />
          )
        }}
      </ResponsivePanel>
      <BookmarkButton meme={meme} />
      {user && matchIsUserAdmin(user) ? (
        <Link
          to="/admin/library/$memeId"
          params={{ memeId: meme.id }}
          className="meme-pill px-3"
          aria-label={m.meme_edit_aria()}
        >
          <Pencil aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}
