import * as React from 'react'
import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { mergeProps } from '@base-ui/react/merge-props'
import { Button } from '~/components/ui/button'
import { preloadOnIntent } from '~/components/ui/preload-on-intent'
import { lazyComponent } from '~/lib/lazy-component'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import type { DialogPopupProps } from './dialog-popup'

const loadDialogPopup = async () => {
  return import('./dialog-popup')
}

const LazyDialogPopup = lazyComponent(async () => {
  const { DialogPopup } = await loadDialogPopup()

  return DialogPopup
})

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...mergeProps(preloadOnIntent(loadDialogPopup), props)}
    />
  )
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogContent(props: DialogPopupProps) {
  return (
    <DialogPortal>
      <React.Suspense fallback={null}>
        <LazyDialogPopup {...props} />
      </React.Suspense>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading leading-none font-medium', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}
