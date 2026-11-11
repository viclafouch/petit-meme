import type { MemeDerivedFormat } from '~/constants/bunny'
import { cn } from '~/lib/utils'

const FORMAT_CHIP_CLASS_NAMES = {
  mp4: 'bg-violet-500/15 text-violet-700! ring-violet-500/30 dark:text-violet-300!',
  mp3: 'bg-emerald-500/15 text-emerald-700! ring-emerald-500/30 dark:text-emerald-300!'
} as const satisfies Record<MemeDerivedFormat, string>

type MemeFormatChipProps = {
  format: MemeDerivedFormat
  className?: string
}

export const MemeFormatChip = ({ format, className }: MemeFormatChipProps) => {
  return (
    <span
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-semibold uppercase ring-1 ring-inset',
        FORMAT_CHIP_CLASS_NAMES[format],
        className
      )}
    >
      {format}
    </span>
  )
}
