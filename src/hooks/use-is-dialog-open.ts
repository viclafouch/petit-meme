import { matchIsDialogOpen, useDialog } from '~/stores/dialog.store'

export const useIsDialogOpen = () => {
  return useDialog(matchIsDialogOpen)
}
