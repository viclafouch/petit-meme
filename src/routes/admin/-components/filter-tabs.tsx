import type React from 'react'
import { cn } from '~/lib/utils'

type FilterTabAnchorProps = React.ComponentProps<'a'> & {
  count: number
  isCurrent: boolean
}

export const FilterTabAnchor = ({
  count,
  isCurrent,
  className,
  children,
  ...props
}: FilterTabAnchorProps) => {
  return (
    <a
      className={cn(
        'relative shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm text-muted-foreground hover:text-foreground',
        className
      )}
      {...props}
      aria-current={isCurrent ? 'page' : undefined}
    >
      {children}
      <span className="ml-1.5 text-xs tabular-nums opacity-60">{count}</span>
    </a>
  )
}

type FilterTabsProps = {
  children: React.ReactNode
}

export const FilterTabs = ({ children }: FilterTabsProps) => {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
      {children}
    </div>
  )
}
