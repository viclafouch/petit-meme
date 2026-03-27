import React from 'react'
import { ClipboardPaste } from 'lucide-react'
import { IconButtonStars } from '~/components/animate-ui/buttons/icon-button-stars'
import { FormControl } from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { useClipboardPaste } from '~/hooks/use-clipboard-paste'
import { m } from '~/paraglide/messages'

type ClipboardPasteInputParams = {
  onClipboardPaste: (text: string) => void
} & Omit<React.ComponentProps<typeof Input>, 'className'>

export const ClipboardPasteInput = ({
  onClipboardPaste,
  ...inputProps
}: ClipboardPasteInputParams) => {
  const clipboard = useClipboardPaste({ onPaste: onClipboardPaste })

  return (
    <div className="relative w-full">
      <FormControl>
        <Input className="pr-9" {...inputProps} />
      </FormControl>
      <IconButtonStars
        active={clipboard.isActive}
        className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
        onClick={clipboard.handlePaste}
        type="button"
        onlyStars
        aria-label={m.clipboard_paste_aria_label()}
      >
        <ClipboardPaste aria-hidden="true" />
      </IconButtonStars>
    </div>
  )
}
