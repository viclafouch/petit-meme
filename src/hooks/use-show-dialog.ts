import { useDialog } from '~/stores/dialog.store'

export const useShowDialog = () => {
  return useDialog((state) => {
    return state.showDialog
  })
}
