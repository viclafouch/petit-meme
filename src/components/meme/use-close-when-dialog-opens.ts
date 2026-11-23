import React from 'react'
import { useSelector } from '@tanstack/react-store'
import { useDialogStore } from '~/stores/dialog.store'

export const useCloseWhenDialogOpens = (close: () => void) => {
  const dialogStore = useDialogStore()
  const isDialogOpen = useSelector(dialogStore, (state) => {
    return state.isOpen
  })
  const [wasDialogOpen, setWasDialogOpen] = React.useState(isDialogOpen)

  if (isDialogOpen !== wasDialogOpen) {
    setWasDialogOpen(isDialogOpen)

    if (isDialogOpen) {
      close()
    }
  }
}
