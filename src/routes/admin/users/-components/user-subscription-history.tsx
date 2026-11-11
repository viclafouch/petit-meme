import type React from 'react'
import type { Stripe } from 'stripe'
import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '~/components/ui/spinner'
import { formatDate } from '~/helpers/date'
import { getErrorMessage } from '~/helpers/error'
import { formatCentsToEuros } from '~/helpers/number'
import { PREMIUM_PLAN_LABELS } from '~/helpers/premium'
import { formatSubscriptionEnding } from '~/helpers/subscription'
import { getLocale } from '~/paraglide/runtime'
import { EmptyMessage } from '~/routes/admin/-components/empty-message'
import { SectionCard } from '~/routes/admin/-components/section-heading'
import { SubscriptionStateBadge } from '~/routes/admin/-components/subscription-state-badge'
import { getAdminUserSubscriptionHistoryQueryOpts } from '~/routes/admin/-lib/queries'
import type { AdminUserSubscriptionHistory } from '~/server/admin/user/user.functions'

type HistorySubscription = AdminUserSubscriptionHistory['subscriptions'][number]

const BILLING_REASON_LABELS: Partial<
  Record<Stripe.Invoice.BillingReason, string>
> = {
  subscription_create: 'Souscription',
  subscription_cycle: 'Renouvellement',
  subscription_update: 'Changement de formule'
}

type SubscriptionInvoicesProps = {
  invoices: HistorySubscription['invoices']
}

const SubscriptionInvoices = ({ invoices }: SubscriptionInvoicesProps) => {
  const locale = getLocale()

  if (invoices.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune facture payée</p>
  }

  return (
    <table className="w-full border-l text-xs text-muted-foreground tabular-nums">
      <caption className="sr-only">Factures payées</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Payée le</th>
          <th scope="col">Motif</th>
          <th scope="col">Montant</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => {
          return (
            <tr key={invoice.id}>
              <td className="py-0.5 pr-4 pl-3 whitespace-nowrap">
                {formatDate(new Date(invoice.paidAt), locale)}
              </td>
              <td className="w-full py-0.5 pr-4">
                {(invoice.billingReason === null
                  ? null
                  : BILLING_REASON_LABELS[invoice.billingReason]) ?? 'Facture'}
              </td>
              <td className="py-0.5 text-right whitespace-nowrap">
                {formatCentsToEuros(invoice.amountPaidCents, { locale })}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

type SubscriptionItemProps = {
  subscription: HistorySubscription
}

const SubscriptionItem = ({ subscription }: SubscriptionItemProps) => {
  const locale = getLocale()
  const endingText = formatSubscriptionEnding(subscription.ending, locale)

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {PREMIUM_PLAN_LABELS[subscription.billingPeriod]}
          </span>
          <SubscriptionStateBadge state={subscription.state} />
        </div>
        <span className="text-xs text-muted-foreground">
          Souscrit le {formatDate(new Date(subscription.startedAt), locale)}.
          {endingText ? ` ${endingText}.` : null}
        </span>
      </div>
      <SubscriptionInvoices invoices={subscription.invoices} />
    </li>
  )
}

type BillingFactProps = {
  label: string
  children: React.ReactNode
}

const BillingFact = ({ label, children }: BillingFactProps) => {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  )
}

type SubscriptionHistoryContentProps = {
  history: AdminUserSubscriptionHistory
}

const SubscriptionHistoryContent = ({
  history
}: SubscriptionHistoryContentProps) => {
  const locale = getLocale()

  if (history.customerSince === null) {
    return <EmptyMessage>Aucun abonnement Stripe</EmptyMessage>
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-3 border-b pb-4 sm:grid-cols-3">
        <BillingFact label="Client depuis">
          {formatDate(new Date(history.customerSince), locale)}
        </BillingFact>
        <BillingFact label="Mois payés">{history.paidMonthCount}</BillingFact>
        <BillingFact label="Encaissé">
          {formatCentsToEuros(history.collectedCents, { locale })}
        </BillingFact>
      </dl>
      <ul className="flex flex-col divide-y divide-border">
        {history.subscriptions.map((subscription) => {
          return (
            <SubscriptionItem
              key={subscription.id}
              subscription={subscription}
            />
          )
        })}
      </ul>
    </div>
  )
}

type UserSubscriptionHistoryProps = {
  userId: string
}

export const UserSubscriptionHistory = ({
  userId
}: UserSubscriptionHistoryProps) => {
  const historyQuery = useQuery(
    getAdminUserSubscriptionHistoryQueryOpts(userId)
  )

  return (
    <SectionCard title="Abonnements Stripe">
      {historyQuery.isError ? (
        <div role="alert" className="flex flex-col gap-1 text-sm">
          <p className="text-destructive">
            Stripe n’a pas répondu. Rechargez la page pour réessayer.
          </p>
          <p className="text-xs text-muted-foreground">
            {getErrorMessage(historyQuery.error)}
          </p>
        </div>
      ) : null}
      {historyQuery.isPending ? (
        <output
          aria-label="Chargement des abonnements Stripe"
          className="block py-6"
        >
          <LoadingSpinner />
        </output>
      ) : null}
      {historyQuery.isSuccess ? (
        <SubscriptionHistoryContent history={historyQuery.data} />
      ) : null}
    </SectionCard>
  )
}
