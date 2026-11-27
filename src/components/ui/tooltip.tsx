import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { preloadOnIntent } from '~/components/ui/preload-on-intent'
import { lazyComponent } from '~/lib/lazy-component'
import { cn } from '~/lib/utils'
import type { TooltipPopupProps } from './tooltip-popup'

const loadTooltipPopup = async () => {
  return import('./tooltip-popup')
}

const LazyTooltipPopup = lazyComponent(async () => {
  const { TooltipPopup } = await loadTooltipPopup()

  return TooltipPopup
})

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...mergeProps(preloadOnIntent(loadTooltipPopup), props)}
    />
  )
}

function TooltipContent(props: TooltipPopupProps) {
  return (
    <TooltipPrimitive.Portal>
      <React.Suspense fallback={null}>
        <LazyTooltipPopup {...props} />
      </React.Suspense>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
