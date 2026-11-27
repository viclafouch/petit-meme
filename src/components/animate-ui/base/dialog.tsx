import * as React from 'react'
import { AnimatePresence } from 'motion/react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { mergeProps } from '@base-ui/react/merge-props'
import { preloadOnIntent } from '~/components/ui/preload-on-intent'
import { lazyComponent } from '~/lib/lazy-component'
import { cn } from '~/lib/utils'
import type { DialogPopupProps } from './dialog-popup'

type DialogContextType = {
  isOpen: boolean
}

const DialogContext = React.createContext<DialogContextType | undefined>(
  undefined
)

const useDialog = (): DialogContextType => {
  const context = React.useContext(DialogContext)

  if (!context) {
    throw new Error('useDialog must be used within a Dialog')
  }

  return context
}

type DialogProps = DialogPrimitive.Root.Props

const Dialog = ({
  open,
  defaultOpen = false,
  onOpenChange,
  ...props
}: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isOpen = open ?? uncontrolledOpen

  const handleOpenChange: DialogProps['onOpenChange'] = (
    nextOpen,
    eventDetails
  ) => {
    setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen, eventDetails)
  }

  return (
    <DialogContext value={{ isOpen }}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DialogContext>
  )
}

type DialogTriggerProps = DialogPrimitive.Trigger.Props

const DialogTrigger = (props: DialogTriggerProps) => {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...mergeProps(preloadOnIntent(loadDialogPopup), props)}
    />
  )
}

type DialogCloseProps = DialogPrimitive.Close.Props

const DialogClose = (props: DialogCloseProps) => {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

const loadDialogPopup = async () => {
  return import('./dialog-popup')
}

const LazyDialogPopup = lazyComponent(async () => {
  const { DialogPopup } = await loadDialogPopup()

  return DialogPopup
})

type DialogContentProps = DialogPopupProps

const DialogContent = (props: DialogContentProps) => {
  const { isOpen } = useDialog()

  return (
    <AnimatePresence>
      {isOpen ? (
        <DialogPrimitive.Portal keepMounted data-slot="dialog-portal">
          <React.Suspense fallback={null}>
            <LazyDialogPopup {...props} />
          </React.Suspense>
        </DialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  )
}

type DialogHeaderProps = React.ComponentProps<'div'>

const DialogHeader = ({ className, ...props }: DialogHeaderProps) => {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex flex-col space-y-1.5 text-center sm:text-left',
        className
      )}
      {...props}
    />
  )
}

type DialogFooterProps = React.ComponentProps<'div'>

const DialogFooter = ({ className, ...props }: DialogFooterProps) => {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2',
        className
      )}
      {...props}
    />
  )
}

type DialogTitleProps = DialogPrimitive.Title.Props

const DialogTitle = ({ className, ...props }: DialogTitleProps) => {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-primary',
        className
      )}
      {...props}
    />
  )
}

type DialogDescriptionProps = DialogPrimitive.Description.Props

const DialogDescription = ({ className, ...props }: DialogDescriptionProps) => {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  type DialogCloseProps,
  DialogContent,
  type DialogContentProps,
  type DialogContextType,
  DialogDescription,
  type DialogDescriptionProps,
  DialogFooter,
  type DialogFooterProps,
  DialogHeader,
  type DialogHeaderProps,
  type DialogProps,
  DialogTitle,
  type DialogTitleProps,
  DialogTrigger,
  type DialogTriggerProps,
  useDialog
}
