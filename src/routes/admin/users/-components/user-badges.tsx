import { Crown, Mail } from 'lucide-react'
import { DiscordIcon, XTwitterIcon } from '~/components/icon'
import { Badge } from '~/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import type { AuthProviderId } from '~/constants/auth'
import { differenceInMonths, formatDate } from '~/helpers/date'
import { getLocale } from '~/paraglide/runtime'
import type {
  EnrichedUser,
  SubscriptionInfo
} from '~/routes/admin/-server/users'

type UserStatusBadgesParams = Pick<EnrichedUser, 'banned' | 'emailVerified'>

export const UserStatusBadges = ({
  banned,
  emailVerified
}: UserStatusBadgesParams) => {
  const isBanned = banned === true
  const isUnverified = emailVerified === false

  return (
    <div className="flex flex-wrap gap-1">
      {!isBanned && !isUnverified ? (
        <Badge variant="success" size="sm">
          Actif
        </Badge>
      ) : null}
      {isBanned ? (
        <Badge variant="destructive" size="sm">
          Banni
        </Badge>
      ) : null}
      {isUnverified ? (
        <Badge variant="warning" size="sm">
          Non vérifié
        </Badge>
      ) : null}
    </div>
  )
}

type ProviderDisplayConfig = {
  label: string
  icon: React.ComponentType<React.ComponentProps<'svg'>>
  variant: React.ComponentProps<typeof Badge>['variant']
}

const AUTH_PROVIDER_DISPLAY = {
  credential: {
    label: 'Email',
    icon: Mail,
    variant: 'secondary'
  },
  twitter: {
    label: 'Twitter',
    icon: XTwitterIcon,
    variant: 'info'
  },
  discord: {
    label: 'Discord',
    icon: DiscordIcon,
    variant: 'default'
  }
} as const satisfies Record<AuthProviderId, ProviderDisplayConfig>

type AuthProviderBadgeParams = {
  provider: AuthProviderId
}

export const AuthProviderBadge = ({ provider }: AuthProviderBadgeParams) => {
  const { label, icon: Icon, variant } = AUTH_PROVIDER_DISPLAY[provider]

  return (
    <Badge variant={variant} size="sm">
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  )
}

type SubscriptionBadgeParams = {
  isActive: boolean
  startedAt: SubscriptionInfo['startedAt']
  endsAt: SubscriptionInfo['endsAt']
}

export const SubscriptionBadge = ({
  isActive,
  startedAt,
  endsAt
}: SubscriptionBadgeParams) => {
  const locale = getLocale()

  const months = startedAt
    ? Math.max(1, differenceInMonths(new Date(), new Date(startedAt)))
    : 1

  const tooltipLines = [
    `${months} mois d'abonnement`,
    endsAt ? `Fin : ${formatDate(new Date(endsAt), locale)}` : null
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default rounded-md">
        {isActive ? (
          <Badge className="bg-amber-500 text-white border-amber-600" size="sm">
            <Crown className="size-3" aria-hidden />
            Premium
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            <Crown className="size-3" aria-hidden />
            Ancien
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent className="whitespace-pre-line">
        {tooltipLines}
      </TooltipContent>
    </Tooltip>
  )
}
