import type React from 'react'
import { CardTitle } from '~/components/ui/card'

type MemeSectionTitleProps = {
  index: number
  children: React.ReactNode
}

export const MemeSectionTitle = ({
  index,
  children
}: MemeSectionTitleProps) => {
  return (
    <CardTitle className="flex items-center gap-3">
      <span
        aria-hidden
        className="font-mono text-xs font-normal text-muted-foreground tabular-nums"
      >
        {String(index).padStart(2, '0')}
      </span>
      {children}
    </CardTitle>
  )
}
