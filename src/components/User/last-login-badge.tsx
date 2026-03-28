import { Check } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { m } from '~/paraglide/messages.js'

export const LastLoginBadge = () => {
  return (
    <Badge
      variant="warning"
      size="sm"
      className="absolute -top-2.5 right-2 z-10"
    >
      <Check className="size-3" aria-hidden="true" />
      {m.auth_last_login_method()}
    </Badge>
  )
}
