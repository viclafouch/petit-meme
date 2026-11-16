import type React from 'react'
import { AudioLines, Download, Film, Share2 } from 'lucide-react'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode } from '~/constants/meme'
import { m } from '~/paraglide/messages'

export const SHEET_HEADER_CLASS_NAME = 'gap-1.5 px-5 pt-2 pb-5 md:gap-1.5'

export const SHEET_TITLE_CLASS_NAME =
  'text-lg leading-snug font-semibold text-balance'

export const SHEET_BODY_CLASS_NAME =
  'flex flex-col gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'

export const SHEET_GROUP_CLASS_NAME =
  'flex flex-col divide-y divide-border overflow-hidden rounded-2xl bg-secondary'

export const SHEET_ROW_CLASS_NAME =
  'flex min-h-14 w-full items-center gap-3 px-4 text-left text-base font-medium touch-tap transition-colors duration-100 active:bg-muted disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0'

export const MEME_EXPORT_MODE_DISPLAY = {
  download: { icon: Download, label: m.meme_download },
  share: { icon: Share2, label: m.meme_share }
} as const satisfies Record<
  MemeExportMode,
  { icon: React.ElementType; label: () => string }
>

export const MEME_FORMAT_DISPLAY = {
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
  { icon: React.ElementType; label: () => string; iconClassName: string }
>
