import type React from 'react'
import { Column, Row, Section, Text } from 'react-email'
import { PREMIUM_PLAN_PRICING } from '~/constants/plan'
import { formatCentsToEuros } from '~/helpers/number'
import {
  type Comparison,
  getWeeklyRecapPeriodLabel
} from '~/helpers/weekly-recap'
import type { WeeklyRecap } from '~/server/weekly-recap.server'
import { EmailLayout } from './email-layout'

type WeeklyRecapEmailProps = {
  recap: WeeklyRecap
}

const TABULAR_STYLE = {
  fontVariantNumeric: 'tabular-nums'
} as const satisfies React.CSSProperties

const countFormatter = new Intl.NumberFormat('fr')
const countDeltaFormatter = new Intl.NumberFormat('fr', {
  signDisplay: 'exceptZero'
})

const VALUE_FORMATTERS = {
  count: {
    value: (count: number) => {
      return countFormatter.format(count)
    },
    delta: (count: number) => {
      return countDeltaFormatter.format(count)
    }
  },
  money: {
    value: (cents: number) => {
      return formatCentsToEuros(cents, {
        locale: 'fr',
        maximumFractionDigits: 2
      })
    },
    delta: (cents: number) => {
      return formatCentsToEuros(cents, {
        locale: 'fr',
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero'
      })
    }
  }
} as const satisfies Record<
  string,
  Record<'value' | 'delta', (amount: number) => string>
>

const NUMBER_CELL_CLASS = 'w-24 py-2.5 text-right align-top text-sm'

const HEADER_CELL_CLASS =
  'w-24 pb-2 text-right align-bottom text-xs text-brand-muted-dark'

const getDeltaClass = (delta: number, isIncreaseBad: boolean) => {
  if (delta === 0) {
    return 'text-brand-muted'
  }

  return delta > 0 !== isIncreaseBad
    ? 'text-brand-success'
    : 'text-brand-danger'
}

type ComparisonRowProps = {
  label: string
  comparison: Comparison
  unit?: keyof typeof VALUE_FORMATTERS
  isIncreaseBad?: boolean
}

const ComparisonRow = ({
  label,
  comparison,
  unit = 'count',
  isIncreaseBad = false
}: ComparisonRowProps) => {
  const formatters = VALUE_FORMATTERS[unit]
  const delta = comparison.current - comparison.previous

  return (
    <Row className="border-0 border-b border-solid border-brand-border">
      <Column className="py-2.5 align-top text-sm text-brand">{label}</Column>
      <Column
        className={`${NUMBER_CELL_CLASS} font-semibold text-brand`}
        style={TABULAR_STYLE}
      >
        {formatters.value(comparison.current)}
      </Column>
      <Column
        className={`${NUMBER_CELL_CLASS} text-brand-muted-dark`}
        style={TABULAR_STYLE}
      >
        {formatters.value(comparison.previous)}
      </Column>
      <Column
        className={`${NUMBER_CELL_CLASS} ${getDeltaClass(delta, isIncreaseBad)}`}
        style={TABULAR_STYLE}
      >
        {delta === 0 ? '=' : formatters.delta(delta)}
      </Column>
    </Row>
  )
}

type RecapTableProps = {
  title: string
  children: React.ReactNode
}

const RecapTable = ({ title, children }: RecapTableProps) => {
  return (
    <Section className="mb-10">
      <Row className="border-0 border-b-2 border-solid border-brand">
        <Column className="pb-2 align-bottom text-base font-semibold text-brand">
          {title}
        </Column>
        <Column className={HEADER_CELL_CLASS}>Cette semaine</Column>
        <Column className={HEADER_CELL_CLASS}>Semaine d’avant</Column>
        <Column className={HEADER_CELL_CLASS}>Évolution</Column>
      </Row>
      {children}
    </Section>
  )
}

export const WeeklyRecapEmail = ({ recap }: WeeklyRecapEmailProps) => {
  const { activeSubscriptions, week } = recap
  const periodLabel = getWeeklyRecapPeriodLabel(recap.window)

  return (
    <EmailLayout preview={`Récap ${periodLabel}`} locale="fr">
      <Text className="m-0 mb-8 text-sm text-brand-muted-dark">
        Semaine {periodLabel}
      </Text>
      <RecapTable title="Abonnements en cours">
        <ComparisonRow
          label={`Mensuels à ${VALUE_FORMATTERS.money.value(PREMIUM_PLAN_PRICING.monthly.priceInCents)}`}
          comparison={activeSubscriptions.monthly}
        />
        <ComparisonRow
          label={`Annuels à ${VALUE_FORMATTERS.money.value(PREMIUM_PLAN_PRICING.yearly.priceInCents)}`}
          comparison={activeSubscriptions.yearly}
        />
        <ComparisonRow label="Total" comparison={activeSubscriptions.total} />
        <ComparisonRow
          label="MRR"
          comparison={activeSubscriptions.mrrCents}
          unit="money"
        />
      </RecapTable>
      <RecapTable title="Activité">
        <ComparisonRow
          label="Nouveaux abonnements"
          comparison={week.newSubscriptions}
        />
        <ComparisonRow
          label="Résiliations"
          comparison={week.cancellations}
          isIncreaseBad
        />
        <ComparisonRow label="Inscriptions" comparison={week.signups} />
        <ComparisonRow
          label="Comptes supprimés"
          comparison={week.accountDeletions}
          isIncreaseBad
        />
        <ComparisonRow label="Vues" comparison={week.views} />
        <ComparisonRow label="Téléchargements" comparison={week.downloads} />
        <ComparisonRow label="Partages" comparison={week.shares} />
        <ComparisonRow
          label="Encaissé"
          comparison={week.collectedCents}
          unit="money"
        />
      </RecapTable>
    </EmailLayout>
  )
}

WeeklyRecapEmail.PreviewProps = {
  recap: {
    window: {
      start: new Date('2026-11-02T00:00:00.000Z'),
      end: new Date('2026-11-09T00:00:00.000Z')
    },
    activeSubscriptions: {
      monthly: { current: 9, previous: 8 },
      yearly: { current: 3, previous: 3 },
      total: { current: 12, previous: 11 },
      mrrCents: { current: 4386, previous: 3988 }
    },
    week: {
      newSubscriptions: { current: 2, previous: 1 },
      cancellations: { current: 1, previous: 0 },
      signups: { current: 41, previous: 36 },
      accountDeletions: { current: 2, previous: 1 },
      views: { current: 500, previous: 443 },
      downloads: { current: 524, previous: 561 },
      shares: { current: 143, previous: 120 },
      collectedCents: { current: 1197, previous: 3798 }
    }
  }
} satisfies WeeklyRecapEmailProps

export default WeeklyRecapEmail
