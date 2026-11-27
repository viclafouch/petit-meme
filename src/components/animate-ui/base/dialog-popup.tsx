import { X } from 'lucide-react'
import type { Transition } from 'motion/react'
import * as motion from 'motion/react-m'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

type FlipDirection = 'top' | 'bottom' | 'left' | 'right'

export type DialogPopupProps = Omit<DialogPrimitive.Popup.Props, 'render'> & {
  from?: FlipDirection
  transition?: Transition
}

export const DialogPopup = ({
  className,
  children,
  from = 'top',
  transition = { type: 'spring', stiffness: 150, damping: 25 },
  ...props
}: DialogPopupProps) => {
  const initialRotation = from === 'top' || from === 'left' ? '20deg' : '-20deg'
  const isVertical = from === 'top' || from === 'bottom'
  const rotateAxis = isVertical ? 'rotateX' : 'rotateY'

  return (
    <>
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
    </>
  )
}
