import type React from 'react'
import { cn } from '~/lib/utils'

type CollapsibleBannerProps = {
  children: React.ReactNode
  isCollapsed: boolean
  isAnimatedOnEntry: boolean
}

export const CollapsibleBanner = ({
  children,
  isCollapsed,
  isAnimatedOnEntry
}: CollapsibleBannerProps) => {
  return (
    <div
      data-collapsed={isCollapsed || undefined}
      className={cn(
        'grid grid-rows-[1fr] transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none data-collapsed:invisible data-collapsed:grid-rows-[0fr] data-collapsed:opacity-0',
        isAnimatedOnEntry && 'starting:grid-rows-[0fr] starting:opacity-0'
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
