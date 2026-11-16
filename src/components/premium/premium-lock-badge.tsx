import { Lock } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { m } from '~/paraglide/messages'

export const PremiumLockBadge = () => {
  return (
    <Badge variant="amber" size="md" className="rounded-full">
      <Lock aria-hidden="true" />
      {m.premium_badge()}
    </Badge>
  )
}
