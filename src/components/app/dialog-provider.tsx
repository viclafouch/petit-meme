import React from 'react'
import { ClientOnly } from '@tanstack/react-router'
import { useCreateStore, useSelector } from '@tanstack/react-store'
import { OverlaySpinner } from '~/components/ui/overlay-spinner'
import {
  createDialogActions,
  DialogStoreProvider,
  INITIAL_DIALOG_STATE,
  useDialogStore
} from '~/stores/dialog.store'

type DialogProviderProps = {
  children: React.ReactNode
}

export const DialogOutlet = () => {
  const dialogStore = useDialogStore()
  const { renderDialog, isOpen } = useSelector(dialogStore)
  const { closeDialog, forceCloseDialog } = dialogStore.actions

  return (
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
  )
}

export const DialogProvider = ({ children }: DialogProviderProps) => {
  const dialogStore = useCreateStore(INITIAL_DIALOG_STATE, createDialogActions)

  return (
    <DialogStoreProvider value={dialogStore}>{children}</DialogStoreProvider>
  )
}
