import { XIcon } from 'lucide-react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

const SheetOverlay = ({
  className,
  ...props
}: SheetPrimitive.Backdrop.Props) => {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs',
        className
      )}
      {...props}
    />
  )
}

export type SheetPopupProps = SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}

export const SheetPopup = ({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetPopupProps) => {
  return (
    <>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">{m.common_close()}</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </>
  )
}
