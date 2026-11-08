import type React from 'react'
import { Badge } from '~/components/ui/badge'
import type { SubscriptionState } from '~/helpers/subscription'

type StateBadge = {
  label: string
  variant: React.ComponentProps<typeof Badge>['variant']
}

const STATE_BADGES = {
  active: { label: 'Actif', variant: 'success' },
  ending: { label: 'Résiliation', variant: 'warning' },
  failing: { label: 'Paiement en échec', variant: 'destructive' },
  ended: { label: 'Résilié', variant: 'outline' }
} as const satisfies Record<SubscriptionState, StateBadge>

type SubscriptionStateBadgeProps = {
  state: SubscriptionState
}

export const SubscriptionStateBadge = ({
  state
}: SubscriptionStateBadgeProps) => {
  const { label, variant } = STATE_BADGES[state]

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  )
}
