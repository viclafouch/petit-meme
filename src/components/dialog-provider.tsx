import React from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { OverlaySpinner } from '~/components/ui/overlay-spinner'
import { useDialog } from '~/stores/dialog.store'

type DialogProviderProps = {
  children: React.ReactNode
}

export const DialogProvider = ({ children }: DialogProviderProps) => {
  const { renderDialog, isOpen, closeDialog, forceCloseDialog } = useDialog()

  return (
    <>
      {children}
      <ClientOnly>
        {renderDialog === null ? null : (
          <React.Suspense
            fallback={
              <OverlaySpinner
                onClick={() => {
                  forceCloseDialog()
                }}
              />
            }
          >
            {renderDialog({ open: isOpen, onOpenChange: closeDialog })}
          </React.Suspense>
        )}
      </ClientOnly>
    </>
  )
}
