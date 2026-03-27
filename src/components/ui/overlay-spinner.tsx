import React from 'react'
import { LoadingSpinner } from '~/components/ui/spinner'

export const OverlaySpinner = (props: React.ComponentProps<'div'>) => {
  return (
    <div
      aria-hidden="true"
      className="animate-in fade-in fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      {...props}
    >
      <LoadingSpinner />
    </div>
  )
}
