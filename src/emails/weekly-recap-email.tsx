import { Column, Row, Section, Text } from 'react-email'
import { PREMIUM_PLAN_PRICING } from '~/constants/plan'
import { formatCentsToEuros } from '~/helpers/number'
import {
  type Comparison,
  getWeeklyRecapPeriodLabel
} from '~/helpers/weekly-recap'
import type { WeeklyRecap } from '~/server/admin/weekly-recap/weekly-recap.server'
import { TABULAR_STYLE } from './constants'
import { EmailParagraph, EmailSection } from './email-blocks'
import { EmailLayout } from './email-layout'

type WeeklyRecapEmailProps = {
  recap: WeeklyRecap
}

const countFormatter = new Intl.NumberFormat('fr')
const countDeltaFormatter = new Intl.NumberFormat('fr', {
  signDisplay: 'exceptZero'
})

const formatCount = (count: number) => {
  return countFormatter.format(count)
}

const formatCountDelta = (count: number) => {
  return countDeltaFormatter.format(count)
}

const formatMoney = (cents: number) => {
  return formatCentsToEuros(cents, {
    locale: 'fr',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatMoneyDelta = (cents: number) => {
  return formatCentsToEuros(cents, {
    locale: 'fr',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
  })
}

const SUBSCRIBERS_PREVIOUS_LABEL = 'Il y a une semaine'
const WEEK_PREVIOUS_LABEL = 'Semaine précédente'

type DeltaBadgeProps = {
  delta: number
  label: string
  isIncreaseBad: boolean
}

const DeltaBadge = ({ delta, label, isIncreaseBad }: DeltaBadgeProps) => {
  const isGood = delta > 0 !== isIncreaseBad

  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${isGood ? 'bg-brand-success-bg text-brand-success' : 'bg-brand-danger-bg text-brand-danger'}`}
      style={TABULAR_STYLE}
    >
      {label}
    </span>
  )
}

type MetricProps = {
  name: string
  previousLabel: string
  count: Comparison
  detail?: string
  cents?: Comparison
  isIncreaseBad?: boolean
}

const Metric = ({
  name,
  detail,
  previousLabel,
  count,
  cents,
  isIncreaseBad = false
}: MetricProps) => {
  const delta = cents
    ? cents.current - cents.previous
    : count.current - count.previous
  const deltaLabel = cents ? formatMoneyDelta(delta) : formatCountDelta(delta)

  const badge =
    delta === 0 ? null : (
      <DeltaBadge
        delta={delta}
        label={deltaLabel}
        isIncreaseBad={isIncreaseBad}
      />
    )
  const detailText =
    detail === undefined ? null : (
      <Text className="m-0 text-sm leading-5 text-brand-muted-dark">
        {detail}
      </Text>
    )

  if (!cents) {
    return (
      <Section className="border-0 border-b border-solid border-brand-border py-4">
        <Row>
          <Column className="align-top">
            <Text className="m-0 text-base leading-6 font-semibold text-brand">
              {name}
              {badge}
            </Text>
            {detailText}
          </Column>
          <Column
            className="w-20 text-right align-top text-base leading-6 font-semibold text-brand"
            style={TABULAR_STYLE}
          >
            {formatCount(count.current)}
          </Column>
        </Row>
        <Text
          className="m-0 mt-1 text-xs leading-5 text-brand-muted-dark"
          style={TABULAR_STYLE}
        >
          {previousLabel} : {formatCount(count.previous)}
        </Text>
      </Section>
    )
  }

  return (
    <Section className="border-0 border-b border-solid border-brand-border py-5">
      <Text className="m-0 text-base leading-6 font-semibold text-brand">
        {name}
        {badge}
      </Text>
      {detailText}
      <Row className="mt-3">
        <Column
          className="text-base leading-6 text-brand"
          style={TABULAR_STYLE}
        >
          {formatCount(count.current)}
        </Column>
        <Column
          className="text-right text-base leading-6 font-semibold text-brand"
          style={TABULAR_STYLE}
        >
          {formatMoney(cents.current)}
        </Column>
      </Row>
      <Text className="m-0 mt-3 text-xs leading-5 text-brand-muted-dark">
        {previousLabel}
      </Text>
      <Row>
        <Column
          className="text-sm leading-5 text-brand-muted-dark"
          style={TABULAR_STYLE}
        >
          {formatCount(count.previous)}
        </Column>
        <Column
          className="text-right text-sm leading-5 text-brand-muted-dark"
          style={TABULAR_STYLE}
        >
          {formatMoney(cents.previous)}
        </Column>
      </Row>
    </Section>
  )
}

export const WeeklyRecapEmail = ({ recap }: WeeklyRecapEmailProps) => {
  const { subscribers, payments, activity } = recap
  const periodLabel = getWeeklyRecapPeriodLabel(recap.window)

  return (
    <EmailLayout
      preview={`Semaine ${periodLabel}`}
      heading="Récap de la semaine"
      locale="fr"
    >
      <EmailParagraph>
        Semaine {periodLabel}, comparée à la semaine précédente.
      </EmailParagraph>
      <EmailSection
        title="Abonnés payants"
        caption="Abonnés à gauche, revenu mensuel récurrent à droite."
      >
        <Metric
          name="Mensuels"
          detail={`${formatMoney(PREMIUM_PLAN_PRICING.monthly.priceInCents)} par mois`}
          previousLabel={SUBSCRIBERS_PREVIOUS_LABEL}
          {...subscribers.monthly}
        />
        <Metric
          name="Annuels"
          detail={`${formatMoney(PREMIUM_PLAN_PRICING.yearly.priceInCents)} par an`}
          previousLabel={SUBSCRIBERS_PREVIOUS_LABEL}
          {...subscribers.yearly}
        />
        <Metric
          name="Total"
          previousLabel={SUBSCRIBERS_PREVIOUS_LABEL}
          {...subscribers.total}
        />
      </EmailSection>
      <EmailSection
        title="Paiements"
        caption="Nombre de paiements à gauche, montant encaissé à droite."
      >
        <Metric
          name="Nouveaux abonnements"
          detail="Premier paiement d’un abonnement"
          previousLabel={WEEK_PREVIOUS_LABEL}
          {...payments.newSubscriptions}
        />
        <Metric
          name="Renouvellements"
          detail="Paiement d’une nouvelle période"
          previousLabel={WEEK_PREVIOUS_LABEL}
          {...payments.renewals}
        />
        <Metric
          name="Total encaissé"
          detail="Tous les paiements, changements de formule compris"
          previousLabel={WEEK_PREVIOUS_LABEL}
          {...payments.total}
        />
      </EmailSection>
      <EmailSection title="Activité">
        <Metric
          name="Résiliations"
          detail="Annoncées cette semaine, effectives en fin de période"
          previousLabel={WEEK_PREVIOUS_LABEL}
          count={activity.cancellations}
          isIncreaseBad
        />
        <Metric
          name="Inscriptions"
          previousLabel={WEEK_PREVIOUS_LABEL}
          count={activity.signups}
        />
        <Metric
          name="Comptes supprimés"
          previousLabel={WEEK_PREVIOUS_LABEL}
          count={activity.accountDeletions}
          isIncreaseBad
        />
        <Metric
          name="Vues"
          previousLabel={WEEK_PREVIOUS_LABEL}
          count={activity.views}
        />
        <Metric
          name="Téléchargements"
          previousLabel={WEEK_PREVIOUS_LABEL}
          count={activity.downloads}
        />
        <Metric
          name="Partages"
          previousLabel={WEEK_PREVIOUS_LABEL}
          count={activity.shares}
        />
      </EmailSection>
    </EmailLayout>
  )
}

WeeklyRecapEmail.PreviewProps = {
  recap: {
    window: {
      start: new Date('2026-11-02T00:00:00.000Z'),
      end: new Date('2026-11-09T00:00:00.000Z')
    },
    subscribers: {
      monthly: {
        count: { current: 9, previous: 8 },
        cents: { current: 3591, previous: 3192 }
      },
      yearly: {
        count: { current: 3, previous: 3 },
        cents: { current: 749.75, previous: 749.75 }
      },
      total: {
        count: { current: 12, previous: 11 },
        cents: { current: 4340.75, previous: 3941.75 }
      }
    },
    payments: {
      newSubscriptions: {
        count: { current: 2, previous: 1 },
        cents: { current: 798, previous: 399 }
      },
      renewals: {
        count: { current: 1, previous: 4 },
        cents: { current: 399, previous: 3399 }
      },
      total: {
        count: { current: 3, previous: 5 },
        cents: { current: 1197, previous: 3798 }
      }
    },
    activity: {
      cancellations: { current: 1, previous: 0 },
      signups: { current: 41, previous: 36 },
      accountDeletions: { current: 2, previous: 1 },
      views: { current: 500, previous: 443 },
      downloads: { current: 524, previous: 561 },
      shares: { current: 143, previous: 120 }
    }
  }
} satisfies WeeklyRecapEmailProps

export default WeeklyRecapEmail
