import * as React from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion, type Transition } from 'motion/react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

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
    // oxlint-disable-next-line react/jsx-no-constructed-context-values
    <DialogContext.Provider value={{ isOpen }}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DialogContext.Provider>
  )
}

type DialogTriggerProps = DialogPrimitive.Trigger.Props

const DialogTrigger = (props: DialogTriggerProps) => {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

type DialogCloseProps = DialogPrimitive.Close.Props

const DialogClose = (props: DialogCloseProps) => {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

type FlipDirection = 'top' | 'bottom' | 'left' | 'right'

type DialogContentProps = Omit<DialogPrimitive.Popup.Props, 'render'> & {
  from?: FlipDirection
  transition?: Transition
}

const DialogContent = ({
  className,
  children,
  from = 'top',
  transition = { type: 'spring', stiffness: 150, damping: 25 },
  ...props
}: DialogContentProps) => {
  const { isOpen } = useDialog()

  const initialRotation = from === 'top' || from === 'left' ? '20deg' : '-20deg'
  const isVertical = from === 'top' || from === 'bottom'
  const rotateAxis = isVertical ? 'rotateX' : 'rotateY'

  return (
    <AnimatePresence>
      {isOpen ? (
        <DialogPrimitive.Portal keepMounted data-slot="dialog-portal">
          <DialogPrimitive.Backdrop
            data-slot="dialog-overlay"
            className="fixed inset-0 z-50 bg-black/80"
            render={
              <motion.div
                key="dialog-overlay"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              />
            }
          />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className={cn(
              'fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg rounded-xl outline-none',
              className
            )}
            render={
              <motion.div
                key="dialog-content"
                initial={{
                  opacity: 0,
                  filter: 'blur(4px)',
                  transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`
                }}
                animate={{
                  opacity: 1,
                  filter: 'blur(0px)',
                  transform: `perspective(500px) ${rotateAxis}(0deg) scale(1)`
                }}
                exit={{
                  opacity: 0,
                  filter: 'blur(4px)',
                  transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`
                }}
                transition={transition}
              />
            }
            {...props}
          >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">{m.common_close()}</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Popup>
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
