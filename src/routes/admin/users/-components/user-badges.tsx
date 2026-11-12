import type React from 'react'
import { Crown, Gift, Mail, ShieldCheck } from 'lucide-react'
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
import {
  getPremiumStatus,
  PREMIUM_PLAN_LABELS,
  type SubscriptionInfo
} from '~/helpers/premium'
import { formatSubscriptionEnding } from '~/helpers/subscription'
import { getLocale } from '~/paraglide/runtime'
import { SubscriptionStateBadge } from '~/routes/admin/-components/subscription-state-badge'
import type { AdminUserListItem } from '~/server/admin/user/user.functions'

type UserStatusBadgesProps = Pick<AdminUserListItem, 'banned' | 'emailVerified'>

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

type EndingTooltipProps = {
  ending: SubscriptionInfo['ending']
  children: React.ReactNode
}

const EndingTooltip = ({ ending, children }: EndingTooltipProps) => {
  const endingText = ending
    ? formatSubscriptionEnding(ending, getLocale())
    : null

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-default flex-wrap gap-1 rounded-md">
        {children}
      </TooltipTrigger>
      <TooltipContent>{endingText ?? 'Aucune date connue'}</TooltipContent>
    </Tooltip>
  )
}

const AdminPremiumBadge = () => {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default rounded-md">
        <Badge size="sm">
          <ShieldCheck className="size-3" aria-hidden />
          Admin
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Premium inclus avec le rôle admin</TooltipContent>
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

type PremiumBadgesProps = Pick<
  AdminUserListItem,
  'role' | 'premiumGrantedAt'
> & {
  subscription: SubscriptionInfo
  emptyFallback: React.ReactNode
}

export const PremiumBadges = ({
  role,
  premiumGrantedAt,
  subscription,
  emptyFallback
}: PremiumBadgesProps) => {
  const premiumStatus = getPremiumStatus({
    role,
    premiumGrantedAt,
    subscription
  })

  switch (premiumStatus.source) {
    case 'admin': {
      return <AdminPremiumBadge />
    }

    case 'paid': {
      return (
        <EndingTooltip
          ending={subscription.state === 'failing' ? null : subscription.ending}
        >
          <Badge variant="amber" size="sm">
            <Crown className="size-3" aria-hidden />
            {subscription.billingPeriod === null
              ? 'Premium'
              : PREMIUM_PLAN_LABELS[subscription.billingPeriod]}
          </Badge>
          {subscription.state === 'ending' ||
          subscription.state === 'failing' ? (
            <SubscriptionStateBadge state={subscription.state} />
          ) : null}
        </EndingTooltip>
      )
    }

    case 'granted': {
      return <GrantedPremiumBadge grantedAt={premiumStatus.grantedAt} />
    }

    case 'none': {
      if (subscription.state === 'failing') {
        return <SubscriptionStateBadge state="failing" />
      }

      return subscription.state === 'ended' ? (
        <EndingTooltip ending={subscription.ending}>
          <SubscriptionStateBadge state="ended" />
        </EndingTooltip>
      ) : (
        emptyFallback
      )
    }
  }
}
