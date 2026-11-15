import { X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { m } from '~/paraglide/messages'

type BannerCloseButtonProps = {
  onClick: () => void
}

export const BannerCloseButton = ({ onClick }: BannerCloseButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={m.common_close()}
      className="absolute right-1 shrink-0 text-foreground/60 hover:bg-transparent hover:text-foreground"
    >
      <X className="size-3.5" aria-hidden="true" />
    </Button>
  )
}
