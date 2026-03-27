import { toast } from 'sonner'
import { m } from '~/paraglide/messages'
import { useMutation } from '@tanstack/react-query'

const RESET_DELAY_MS = 3000

type ClipboardPasteParams = {
  onPaste: (text: string) => void
}

export const useClipboardPaste = ({ onPaste }: ClipboardPasteParams) => {
  const mutation = useMutation({
    mutationFn: () => {
      return navigator.clipboard.readText()
    },
    onSuccess: (text) => {
      onPaste(text.trim())
    },
    onError: () => {
      toast.error(m.clipboard_error_read())
    },
    onSettled: () => {
      setTimeout(() => {
        mutation.reset()
      }, RESET_DELAY_MS)
    }
  })

  const handlePaste = () => {
    mutation.mutate()
  }

  return {
    handlePaste,
    isActive: mutation.isPending || mutation.isSuccess
  }
}
