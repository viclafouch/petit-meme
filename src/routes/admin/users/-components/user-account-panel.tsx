import React from 'react'
import {
  Ban,
  CircleSlash,
  ExternalLink,
  Gift,
  ShieldCheck,
  Trash
} from 'lucide-react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { DATE_WITH_TIME_OPTIONS, formatDate } from '~/helpers/date'
import { formatSubscriptionEnding } from '~/helpers/subscription'
import { getLocale } from '~/paraglide/runtime'
import { SectionHeading } from '~/routes/admin/-components/section-heading'
import { getPremiumStatus } from '~/routes/admin/-lib/premium'
import { buildSentryUserLinks } from '~/routes/admin/-lib/sentry'
import type { AdminUserDetailPayload } from '~/routes/admin/-server/user-detail'
import { AuthProviderBadge } from '~/routes/admin/users/-components/user-badges'
import {
  getUserActionPermissions,
  NO_USER_ACTION_REASON,
  useUserActions
} from './use-user-actions'
import { UserActionDialogs } from './user-action-dialogs'

const routeApi = getRouteApi('/admin')

type PanelSectionProps = {
  title: string
  children: React.ReactNode
}

const PanelSection = ({ title, children }: PanelSectionProps) => {
  const titleId = React.useId()

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 p-5">
      <h2 id={titleId} className="text-sm font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

type AccountFactProps = {
  label: string
  children: React.ReactNode
}

const AccountFact = ({ label, children }: AccountFactProps) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  )
}

type PanelNoteProps = {
  children: React.ReactNode
}

const PanelNote = ({ children }: PanelNoteProps) => {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

type PremiumSummaryProps = Pick<AdminUserDetailPayload, 'user' | 'subscription'>

const PremiumSummary = ({ user, subscription }: PremiumSummaryProps) => {
  const locale = getLocale()

  const premiumStatus = getPremiumStatus({
    role: user.role,
    premiumGrantedAt: user.premiumGrantedAt,
    subscription
  })
  const endingText = subscription.ending
    ? formatSubscriptionEnding(subscription.ending, locale)
    : null

  switch (premiumStatus.source) {
    case 'admin': {
      return <PanelNote>Premium inclus avec le rôle admin.</PanelNote>
    }

    case 'paid': {
      return (
        <PanelNote>
          Abonnement payant.{endingText ? ` ${endingText}.` : null}
        </PanelNote>
      )
    }

    case 'granted': {
      return (
        <PanelNote>
          Offert le {formatDate(new Date(premiumStatus.grantedAt), locale)},
          sans date de fin.
        </PanelNote>
      )
    }

    case 'none': {
      if (subscription.state === 'failing') {
        return (
          <PanelNote>Plan gratuit, le dernier paiement a échoué.</PanelNote>
        )
      }

      return subscription.state === 'ended' ? (
        <PanelNote>
          Plan gratuit, ancien abonné.{endingText ? ` ${endingText}.` : null}
        </PanelNote>
      ) : (
        <PanelNote>Plan gratuit.</PanelNote>
      )
    }
  }
}

type SentryLinksProps = {
  userId: AdminUserDetailPayload['user']['id']
}

const SentryLinks = ({ userId }: SentryLinksProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {buildSentryUserLinks(userId).map((link) => {
        return (
          <Button
            key={link.label}
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${link.label} Sentry (ouvre dans un nouvel onglet)`}
              />
            }
          >
            <ExternalLink data-icon="inline-start" aria-hidden />
            {link.label}
          </Button>
        )
      })}
    </div>
  )
}

type UserAccountPanelProps = Pick<
  AdminUserDetailPayload,
  'user' | 'provider' | 'subscription'
>

export const UserAccountPanel = ({
  user,
  provider,
  subscription
}: UserAccountPanelProps) => {
  const { user: admin } = routeApi.useRouteContext()
  const navigate = useNavigate()
  const locale = getLocale()

  const userActions = useUserActions({
    userId: user.id,
    onDeleted: () => {
      void navigate({ to: '/admin/users' })
    }
  })

  const permissions = getUserActionPermissions({
    target: { ...user, subscription },
    adminId: admin.id
  })

  const hasModerationActions =
    permissions.canBan || permissions.canUnban || permissions.canDelete

  return (
    <aside aria-label="Compte de l'utilisateur">
      <SectionHeading title="Compte" />
      <div className="flex flex-col divide-y divide-border rounded-xl border bg-card">
        <dl className="flex flex-col gap-3.5 p-5 text-sm">
          <AccountFact label="Connexion">
            <AuthProviderBadge provider={provider} />
          </AccountFact>
          <AccountFact label="Rôle">
            {user.role === 'admin' ? (
              <Badge size="sm">Admin</Badge>
            ) : (
              <Badge variant="secondary" size="sm">
                User
              </Badge>
            )}
          </AccountFact>
          <AccountFact label="Inscrit le">
            {formatDate(new Date(user.createdAt), locale)}
          </AccountFact>
          <AccountFact label="Dernière activité">
            {user.lastActiveAt
              ? formatDate(
                  new Date(user.lastActiveAt),
                  locale,
                  DATE_WITH_TIME_OPTIONS
                )
              : 'Jamais'}
          </AccountFact>
          <AccountFact label="Générations">{user.generationCount}</AccountFact>
        </dl>
        <PanelSection title="Premium">
          <PremiumSummary user={user} subscription={subscription} />
          {permissions.isGrantPremiumBlockedByPayment ? (
            <PanelNote>
              Offrir Premium est impossible pendant un abonnement payant.
            </PanelNote>
          ) : null}
          {permissions.canGrantPremium ? (
            <Button
              variant="outline"
              className="self-start"
              aria-busy={userActions.isPending}
              onClick={() => {
                userActions.openDialog('grantPremium')
              }}
            >
              <Gift />
              Offrir Premium
            </Button>
          ) : null}
          {permissions.canRevokePremium ? (
            <Button
              variant="outline"
              className="self-start"
              aria-busy={userActions.isPending}
              onClick={() => {
                userActions.openDialog('revokePremium')
              }}
            >
              <CircleSlash />
              Retirer Premium
            </Button>
          ) : null}
        </PanelSection>
        <PanelSection title="Modération">
          {user.banned === true ? (
            <p className="text-sm text-destructive">
              {user.banReason ? `Banni, raison : ${user.banReason}.` : 'Banni.'}
            </p>
          ) : null}
          {hasModerationActions ? (
            <div className="flex flex-wrap gap-2">
              {permissions.canUnban ? (
                <Button
                  variant="outline"
                  aria-busy={userActions.isPending}
                  onClick={() => {
                    userActions.openDialog('unban')
                  }}
                >
                  <ShieldCheck />
                  Débannir
                </Button>
              ) : null}
              {permissions.canBan ? (
                <Button
                  variant="outline"
                  aria-busy={userActions.isPending}
                  onClick={() => {
                    userActions.openDialog('ban')
                  }}
                >
                  <Ban />
                  Bannir
                </Button>
              ) : null}
              {permissions.canDelete ? (
                <Button
                  variant="destructive"
                  aria-busy={userActions.isPending}
                  onClick={() => {
                    userActions.openDialog('delete')
                  }}
                >
                  <Trash />
                  Supprimer
                </Button>
              ) : null}
            </div>
          ) : (
            <PanelNote>{NO_USER_ACTION_REASON}</PanelNote>
          )}
        </PanelSection>
        <PanelSection title="Sentry">
          <SentryLinks userId={user.id} />
        </PanelSection>
      </div>
      <UserActionDialogs userName={user.name} userActions={userActions} />
    </aside>
  )
}
