import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { preloadOnIntent } from '~/components/ui/preload-on-intent'
import { lazyComponent } from '~/lib/lazy-component'
import { cn } from '~/lib/utils'
import type { PopoverPopupProps } from './popover-popup'

const loadPopoverPopup = async () => {
  return import('./popover-popup')
}

const LazyPopoverPopup = lazyComponent(async () => {
  const { PopoverPopup } = await loadPopoverPopup()

  return PopoverPopup
})

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      {...mergeProps(preloadOnIntent(loadPopoverPopup), props)}
    />
  )
}

function PopoverContent(props: PopoverPopupProps) {
  return (
    <PopoverPrimitive.Portal>
      <React.Suspense fallback={null}>
        <LazyPopoverPopup {...props} />
      </React.Suspense>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn('font-medium', className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger
}
