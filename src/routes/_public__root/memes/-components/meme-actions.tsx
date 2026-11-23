import { Clapperboard, Download, Pencil, Star } from 'lucide-react'
import { Link, useRouteContext } from '@tanstack/react-router'
import { useBookmark } from '~/components/bookmark/use-bookmark'
import { MessagingAppIcon } from '~/components/icon/messaging-app-icon'
import { MemeExportPanel } from '~/components/meme/meme-export-panel'
import { markStudioEntry } from '~/components/studio/use-studio-history'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import { MESSAGING_APPS, type MessagingApp } from '~/constants/messaging-apps'
import { matchIsUserAdmin } from '~/helpers/role'
import { useActivationCount } from '~/hooks/use-activation-count'
import { m } from '~/paraglide/messages'

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

type BookmarkButtonProps = {
  meme: MemeWithVideo
}

const BookmarkButton = ({ meme }: BookmarkButtonProps) => {
  const bookmark = useBookmark({ memeId: meme.id })
  const burstCount = useActivationCount(bookmark.isBookmarked)

  return (
    <button
      type="button"
      className="pill meme-pill-bookmark"
      aria-pressed={bookmark.isBookmarked}
      onClick={() => {
        bookmark.toggle()
      }}
    >
      <span className="relative grid place-items-center">
        <Star aria-hidden="true" />
        {bookmark.isBookmarked && burstCount > 0 ? (
          <span
            key={burstCount}
            className="absolute inset-0 grid place-items-center"
          >
            <Sparkles />
          </span>
        ) : null}
      </span>
      {bookmark.isBookmarked ? m.meme_bookmarked() : m.meme_bookmark()}
    </button>
  )
}

type MemeActionsProps = {
  meme: MemeWithVideo
  isSharing: boolean
  isDownloading: boolean
  onPause: () => void
  onExport: (mode: MemeExportMode, format: MemeDerivedFormat) => void
}

export const MemeActions = ({
  meme,
  isSharing,
  isDownloading,
  onPause,
  onExport
}: MemeActionsProps) => {
  const { user } = useRouteContext({ from: '__root__' })

  return (
    <div className="meme-actions">
      <MemeExportPanel
        mode="share"
        meme={meme}
        isPending={isSharing}
        onExport={(format) => {
          onExport('share', format)
        }}
        render={
          <button type="button" aria-label={m.meme_share()} className="pill" />
        }
      >
        <ShareAvatars />
        {m.meme_share()}
      </MemeExportPanel>
      <Link
        to="/memes/$memeId/studio"
        params={{ memeId: meme.id }}
        state={markStudioEntry}
        resetScroll={false}
        className="pill pill-brand"
        onClick={onPause}
      >
        <Clapperboard aria-hidden="true" />
        {m.meme_studio()}
      </Link>
      <MemeExportPanel
        mode="download"
        meme={meme}
        isPending={isDownloading}
        onExport={(format) => {
          onExport('download', format)
        }}
        render={
          <button
            type="button"
            aria-label={m.meme_download()}
            className="pill"
          />
        }
      >
        <Download aria-hidden="true" />
        {m.meme_download()}
      </MemeExportPanel>
      <BookmarkButton meme={meme} />
      {user && matchIsUserAdmin(user) ? (
        <Link
          to="/admin/library/$memeId"
          params={{ memeId: meme.id }}
          className="pill meme-pill-edit"
          aria-label={m.meme_edit_aria()}
        >
          <Pencil aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}
