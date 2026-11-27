import * as React from 'react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { mergeProps } from '@base-ui/react/merge-props'
import { preloadOnIntent } from '~/components/ui/preload-on-intent'
import { lazyComponent } from '~/lib/lazy-component'
import { cn } from '~/lib/utils'
import type { DrawerContextProps, DrawerPopupProps } from './drawer-popup'

const loadDrawerPopup = async () => {
  return import('./drawer-popup')
}

const LazyDrawerPopup = lazyComponent(async () => {
  const { DrawerPopup } = await loadDrawerPopup()

  return DrawerPopup
})

const DrawerContext = React.createContext<DrawerContextProps | null>(null)

function useDrawer() {
  const context = React.useContext(DrawerContext)

  if (!context) {
    throw new Error('useDrawer must be used within a Drawer.')
  }

  return context
}

function Drawer({
  modal = true,
  showSwipeHandle = false,
  snapPoints,
  swipeDirection = 'down',
  ...props
}: DrawerPrimitive.Root.Props & {
  showSwipeHandle?: boolean
}) {
  const hasSnapPoints = snapPoints != null && snapPoints.length > 0
  const contextValue = React.useMemo(
    () => ({ hasSnapPoints, modal, showSwipeHandle, swipeDirection }),
    [hasSnapPoints, modal, showSwipeHandle, swipeDirection]
  )

  return (
    <DrawerContext value={contextValue}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        modal={modal}
        snapPoints={snapPoints}
        swipeDirection={swipeDirection}
        {...props}
      />
    </DrawerContext>
  )
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return (
    <DrawerPrimitive.Trigger
      data-slot="drawer-trigger"
      {...mergeProps(preloadOnIntent(loadDrawerPopup), props)}
    />
  )
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerContent(
  props: Omit<DrawerPopupProps, keyof DrawerContextProps>
) {
  const drawerContext = useDrawer()

  return (
    <DrawerPortal data-slot="drawer-portal">
      <React.Suspense fallback={null}>
        <LazyDrawerPopup {...props} {...drawerContext} />
      </React.Suspense>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex shrink-0 flex-col gap-0.5 p-4 pb-0 group-data-[swipe-axis=y]/drawer-popup:text-center md:gap-1.5 md:text-left',
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex shrink-0 flex-col gap-2 p-4 pt-0', className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('font-heading font-medium text-foreground', className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-balance text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription
}
