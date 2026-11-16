import type React from 'react'

type CollapsibleBannerProps = {
  children: React.ReactNode
  isCollapsed: boolean
}

export const CollapsibleBanner = ({
  children,
  isCollapsed
}: CollapsibleBannerProps) => {
  return (
    <div
      data-site-banner
      data-collapsed={isCollapsed || undefined}
      className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none data-collapsed:invisible data-collapsed:grid-rows-[0fr] data-collapsed:opacity-0"
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
