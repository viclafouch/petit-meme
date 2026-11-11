import React from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { OverlaySpinner } from '~/components/ui/overlay-spinner'
import { dialogStore } from '~/stores/dialog.store'

type DialogProviderProps = {
  children: React.ReactNode
}

export const DialogProvider = ({ children }: DialogProviderProps) => {
  const { renderDialog, isOpen } = useSelector(dialogStore)
  const { closeDialog, forceCloseDialog } = dialogStore.actions

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
