import type React from 'react'
import { Crown, Gift, Mail } from 'lucide-react'
import { DiscordIcon } from '~/components/icon/discord'
import { XTwitterIcon } from '~/components/icon/x-twitter'
import { Badge } from '~/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import type { AuthProviderId } from '~/constants/auth'
import { formatDate } from '~/helpers/date'
import { getLocale } from '~/paraglide/runtime'
import { getPremiumStatus } from '~/routes/admin/-lib/premium'
import type {
  EnrichedUser,
  SubscriptionInfo
} from '~/routes/admin/-server/users'

type UserStatusBadgesProps = Pick<EnrichedUser, 'banned' | 'emailVerified'>

export const UserStatusBadges = ({
  banned,
  emailVerified
}: UserStatusBadgesProps) => {
  const isBanned = banned === true
  const isUnverified = !emailVerified

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
    variant: 'discord'
  }
} as const satisfies Record<AuthProviderId, ProviderDisplayConfig>

type AuthProviderBadgeProps = {
  provider: AuthProviderId
}

export const AuthProviderBadge = ({ provider }: AuthProviderBadgeProps) => {
  const { label, icon: Icon, variant } = AUTH_PROVIDER_DISPLAY[provider]

  return (
    <Badge variant={variant} size="sm">
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  )
}

type SubscriptionBadgeProps = {
  isActive: boolean
  monthCount: SubscriptionInfo['monthCount']
  endsAt: SubscriptionInfo['endsAt']
}

const SubscriptionBadge = ({
  isActive,
  monthCount,
  endsAt
}: SubscriptionBadgeProps) => {
  const locale = getLocale()

  const tooltipLines = [
    `${monthCount} mois d'abonnement`,
    endsAt ? `Fin : ${formatDate(new Date(endsAt), locale)}` : null
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default rounded-md">
        {isActive ? (
          <Badge variant="amber" size="sm">
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

type GrantedPremiumBadgeProps = {
  grantedAt: Date
}

const GrantedPremiumBadge = ({ grantedAt }: GrantedPremiumBadgeProps) => {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default rounded-md">
        <Badge
          variant="outline"
          size="sm"
          className="border-amber-500/70 text-amber-600 dark:text-amber-400"
        >
          <Gift className="size-3" aria-hidden />
          Offert
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Premium offert le {formatDate(new Date(grantedAt), getLocale())}
      </TooltipContent>
    </Tooltip>
  )
}

type PremiumBadgesProps = {
  premiumGrantedAt: Date | null
  subscription: SubscriptionInfo
  emptyFallback: React.ReactNode
}

export const PremiumBadges = ({
  premiumGrantedAt,
  subscription,
  emptyFallback
}: PremiumBadgesProps) => {
  const premiumStatus = getPremiumStatus({ premiumGrantedAt, subscription })

  switch (premiumStatus.source) {
    case 'paid': {
      return (
        <SubscriptionBadge
          isActive
          monthCount={subscription.monthCount}
          endsAt={subscription.endsAt}
        />
      )
    }

    case 'granted': {
      return <GrantedPremiumBadge grantedAt={premiumStatus.grantedAt} />
    }

    case 'none': {
      return subscription.status === 'past' ? (
        <SubscriptionBadge
          isActive={false}
          monthCount={subscription.monthCount}
          endsAt={subscription.endsAt}
        />
      ) : (
        emptyFallback
      )
    }
  }
}
