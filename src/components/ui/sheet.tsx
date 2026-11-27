import * as React from 'react'
import { XIcon } from 'lucide-react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { mergeProps } from '@base-ui/react/merge-props'
import { Button } from '~/components/ui/button'
import { preloadOnIntent } from '~/components/ui/preload-on-intent'
import { lazyComponent } from '~/lib/lazy-component'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import type { SheetPopupProps } from './sheet-popup'

const loadSheetPopup = async () => {
  return import('./sheet-popup')
}

const LazySheetPopup = lazyComponent(async () => {
  const { SheetPopup } = await loadSheetPopup()

  return SheetPopup
})

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      {...mergeProps(preloadOnIntent(loadSheetPopup), props)}
    />
  )
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetContent(props: SheetPopupProps) {
  return (
    <SheetPortal>
      <React.Suspense fallback={null}>
        <LazySheetPopup {...props} />
      </React.Suspense>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-heading font-medium text-foreground', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
}
