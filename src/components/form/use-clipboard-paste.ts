import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { m } from '~/paraglide/messages'

const RESET_DELAY_MS = 3000

type ClipboardPasteParams = {
  onPaste: (text: string) => void
}

export const useClipboardPaste = ({ onPaste }: ClipboardPasteParams) => {
  const pasteMutation = useMutation({
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
        pasteMutation.reset()
      }, RESET_DELAY_MS)
    }
  })

  const handlePaste = () => {
    pasteMutation.mutate()
  }

  return {
    handlePaste,
    isActive: pasteMutation.isPending || pasteMutation.isSuccess
  }
}
