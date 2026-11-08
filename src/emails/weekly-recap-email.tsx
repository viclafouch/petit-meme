import type React from 'react'
import { Column, Link, Row, Section, Text } from 'react-email'
import { differenceInMonths, formatDate } from '~/helpers/date'
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

type Person =
  | WeeklyRecap['arrivals'][number]
  | WeeklyRecap['departures'][number]

const DAY_MONTH_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long'
}

const FULL_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DAY_MONTH_OPTIONS,
  year: 'numeric'
}

const TABULAR_STYLE = {
  fontVariantNumeric: 'tabular-nums'
} as const satisfies React.CSSProperties

const countFormatter = new Intl.NumberFormat('fr')
const deltaFormatter = new Intl.NumberFormat('fr', {
  signDisplay: 'exceptZero'
})
const frenchPlural = new Intl.PluralRules('fr')

const formatMoney = (cents: number) => {
  return formatCentsToEuros(cents, { locale: 'fr', maximumFractionDigits: 2 })
}

const formatMoneyDelta = (cents: number) => {
  return formatCentsToEuros(cents, {
    locale: 'fr',
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
  })
}

const pluralize = (count: number, one: string, other: string) => {
  return `${countFormatter.format(count)} ${frenchPlural.select(count) === 'one' ? one : other}`
}

const formatTenure = (since: Date, until: Date) => {
  const months = differenceInMonths(until, since)

  return months < 1 ? "moins d'un mois" : `${String(months)} mois`
}

const describePlan = (person: Person) => {
  const plan = person.interval === 'year' ? 'Annuel' : 'Mensuel'

  return [plan, ...person.providers].join(', ')
}

const describeArrival = (
  arrival: WeeklyRecap['arrivals'][number],
  reference: Date
) => {
  if (!arrival.isComeback) {
    return `${describePlan(arrival)}, premier abonnement`
  }

  return `${describePlan(arrival)}, retour, premier abonnement le ${formatDate(arrival.firstStartedAt, 'fr', FULL_DATE_OPTIONS)} (il y a ${formatTenure(arrival.firstStartedAt, reference)})`
}

const describeDeparture = (
  departure: WeeklyRecap['departures'][number],
  reference: Date
) => {
  const until = departure.endsAt ?? reference
  const tenure = `abonné depuis le ${formatDate(departure.startedAt, 'fr', FULL_DATE_OPTIONS)} (${formatTenure(departure.startedAt, until)})`

  if (!departure.endsAt) {
    return `${describePlan(departure)}, ${tenure}`
  }

  const verb = departure.endsAt <= reference ? 'terminé le' : 'fin le'

  return `${describePlan(departure)}, ${tenure}, ${verb} ${formatDate(departure.endsAt, 'fr', DAY_MONTH_OPTIONS)}`
}

type DeltaProps = {
  delta: number
  label: string
}

const Delta = ({ delta, label }: DeltaProps) => {
  if (delta === 0) {
    return <span className="text-brand-muted">=</span>
  }

  return (
    <span className={delta > 0 ? 'text-brand-success' : 'text-brand-danger'}>
      {label}
    </span>
  )
}

type MetricRowProps = {
  label: string
  value: string
  delta: number
  deltaLabel: string
  detail?: string
}

const MetricRow = ({
  label,
  value,
  delta,
  deltaLabel,
  detail
}: MetricRowProps) => {
  return (
    <Row className="border-0 border-b border-solid border-brand-border">
      <Column className="py-2.5 align-top">
        <Text className="m-0 text-sm text-brand">{label}</Text>
        {detail ? (
          <Text className="m-0 text-xs text-brand-muted-dark">{detail}</Text>
        ) : null}
      </Column>
      <Column
        className="py-2.5 text-right align-top text-sm font-semibold text-brand"
        style={TABULAR_STYLE}
      >
        {value}
      </Column>
      <Column
        className="w-20 py-2.5 text-right align-top text-sm"
        style={TABULAR_STYLE}
      >
        <Delta delta={delta} label={deltaLabel} />
      </Column>
    </Row>
  )
}

type CountRowProps = {
  label: string
  comparison: Comparison
}

const CountRow = ({ label, comparison }: CountRowProps) => {
  const delta = comparison.current - comparison.previous

  return (
    <MetricRow
      label={label}
      value={countFormatter.format(comparison.current)}
      delta={delta}
      deltaLabel={deltaFormatter.format(delta)}
    />
  )
}

type HeadingProps = {
  children: string
}

const Heading = ({ children }: HeadingProps) => {
  return (
    <Text className="m-0 mt-10 mb-1 text-base font-semibold text-brand">
      {children}
    </Text>
  )
}

type PersonRowProps = {
  person: Person
  description: string
}

const PersonRow = ({ person, description }: PersonRowProps) => {
  return (
    <Section className="border-0 border-b border-solid border-brand-border py-2.5">
      <Text className="m-0 text-sm font-semibold text-brand">
        {person.adminUrl ? (
          <Link href={person.adminUrl} className="text-brand underline">
            {person.email}
          </Link>
        ) : (
          person.email
        )}
      </Text>
      <Text className="m-0 mt-0.5 text-xs leading-5 text-brand-muted-dark">
        {description}
      </Text>
    </Section>
  )
}

type EmptyLineProps = {
  children: string
}

const EmptyLine = ({ children }: EmptyLineProps) => {
  return <Text className="m-0 py-2.5 text-sm text-brand-muted">{children}</Text>
}

export const WeeklyRecapEmail = ({ recap }: WeeklyRecapEmailProps) => {
  const { revenue, arrivals, departures, funnel, usage, topMemes } = recap
  const reference = recap.window.end
  const headline = `${pluralize(arrivals.length, 'nouvel abonné', 'nouveaux abonnés')}, ${pluralize(departures.length, 'départ', 'départs')}.`
  const mrrDelta = revenue.mrrCents.current - revenue.mrrCents.previous
  const subscribersDelta =
    revenue.subscribers.current - revenue.subscribers.previous
  const collectedDelta =
    revenue.collectedCents.current - revenue.collectedCents.previous

  return (
    <EmailLayout preview={headline} locale="fr">
      <Section>
        <Text className="m-0 text-2xl leading-8 font-semibold text-brand">
          {headline}
        </Text>
        <Text className="m-0 mt-2 text-sm leading-6 text-brand-muted-dark">
          Semaine {getWeeklyRecapPeriodLabel(recap.window)}, comparée à la
          semaine d’avant.
        </Text>
        <Heading>Revenus</Heading>
        <MetricRow
          label="MRR"
          value={formatMoney(revenue.mrrCents.current)}
          delta={mrrDelta}
          deltaLabel={formatMoneyDelta(mrrDelta)}
        />
        <MetricRow
          label="Abonnés actifs"
          detail={`${pluralize(revenue.monthly, 'mensuel', 'mensuels')}, ${pluralize(revenue.yearly, 'annuel', 'annuels')}`}
          value={countFormatter.format(revenue.subscribers.current)}
          delta={subscribersDelta}
          deltaLabel={deltaFormatter.format(subscribersDelta)}
        />
        <MetricRow
          label="Encaissé"
          value={formatMoney(revenue.collectedCents.current)}
          delta={collectedDelta}
          deltaLabel={formatMoneyDelta(collectedDelta)}
        />
        <Heading>Départs</Heading>
        {departures.length > 0 ? (
          departures.map((departure) => {
            return (
              <PersonRow
                key={`${departure.email}-${departure.startedAt.toISOString()}`}
                person={departure}
                description={describeDeparture(departure, reference)}
              />
            )
          })
        ) : (
          <EmptyLine>Aucune résiliation cette semaine.</EmptyLine>
        )}
        <Heading>Arrivées</Heading>
        {arrivals.length > 0 ? (
          arrivals.map((arrival) => {
            return (
              <PersonRow
                key={`${arrival.email}-${arrival.startedAt.toISOString()}`}
                person={arrival}
                description={describeArrival(arrival, reference)}
              />
            )
          })
        ) : (
          <EmptyLine>Aucun nouvel abonné cette semaine.</EmptyLine>
        )}
        <Heading>Conversion</Heading>
        <CountRow label="Inscriptions" comparison={funnel.signups} />
        <CountRow
          label="Checkouts commencés"
          comparison={funnel.checkoutsStarted}
        />
        <CountRow label="Checkouts payés" comparison={funnel.checkoutsPaid} />
        <Heading>Usage</Heading>
        <CountRow label="Vues" comparison={usage.views} />
        <CountRow label="Exports" comparison={usage.exports} />
        <CountRow label="Générations" comparison={usage.generations} />
        <CountRow label="Partages" comparison={usage.shares} />
        <CountRow label="Recherches IA" comparison={usage.aiSearches} />
        <Heading>Memes les plus vus</Heading>
        {topMemes.length > 0 ? (
          topMemes.map((meme, index) => {
            return (
              <Row
                key={meme.url}
                className="border-0 border-b border-solid border-brand-border"
              >
                <Column
                  className="w-6 py-2.5 align-top text-sm text-brand-muted"
                  style={TABULAR_STYLE}
                >
                  {index + 1}
                </Column>
                <Column className="py-2.5 align-top text-sm">
                  <Link href={meme.url} className="text-brand underline">
                    {meme.title}
                  </Link>
                </Column>
                <Column
                  className="py-2.5 text-right align-top text-sm text-brand-muted-dark"
                  style={TABULAR_STYLE}
                >
                  {pluralize(meme.views, 'vue', 'vues')}
                </Column>
              </Row>
            )
          })
        ) : (
          <EmptyLine>Aucune vue cette semaine.</EmptyLine>
        )}
      </Section>
    </EmailLayout>
  )
}

WeeklyRecapEmail.PreviewProps = {
  recap: {
    window: {
      start: new Date('2026-11-01T00:00:00.000Z'),
      end: new Date('2026-11-08T00:00:00.000Z')
    },
    revenue: {
      mrrCents: { current: 4386, previous: 3988 },
      subscribers: { current: 12, previous: 11 },
      monthly: 9,
      yearly: 3,
      collectedCents: { current: 1197, previous: 3798 }
    },
    arrivals: [
      {
        email: 'alan@example.com',
        adminUrl: 'https://www.petit-meme.io/admin/users/user_1',
        providers: ['Twitter'],
        interval: 'month',
        startedAt: new Date('2026-11-03T00:00:00.000Z'),
        firstStartedAt: new Date('2026-11-03T00:00:00.000Z'),
        isComeback: false
      },
      {
        email: 'marie@example.com',
        adminUrl: 'https://www.petit-meme.io/admin/users/user_2',
        providers: ['Email', 'Discord'],
        interval: 'year',
        startedAt: new Date('2026-11-05T00:00:00.000Z'),
        firstStartedAt: new Date('2026-03-12T00:00:00.000Z'),
        isComeback: true
      }
    ],
    departures: [
      {
        email: 'lea@example.com',
        adminUrl: 'https://www.petit-meme.io/admin/users/user_3',
        providers: ['Email'],
        interval: 'month',
        startedAt: new Date('2026-08-29T00:00:00.000Z'),
        firstStartedAt: new Date('2026-08-29T00:00:00.000Z'),
        endsAt: new Date('2026-11-29T00:00:00.000Z')
      }
    ],
    funnel: {
      signups: { current: 41, previous: 36 },
      checkoutsStarted: { current: 5, previous: 4 },
      checkoutsPaid: { current: 2, previous: 2 }
    },
    usage: {
      views: { current: 3812, previous: 3420 },
      exports: { current: 524, previous: 561 },
      generations: { current: 88, previous: 71 },
      shares: { current: 143, previous: 120 },
      aiSearches: { current: 230, previous: 198 }
    },
    topMemes: [
      {
        title: 'Le chat qui danse',
        url: 'https://www.petit-meme.io/memes/clx1',
        views: 412
      },
      {
        title: 'Quand tu ouvres Twitter le lundi',
        url: 'https://www.petit-meme.io/memes/clx2',
        views: 268
      }
    ]
  }
} satisfies WeeklyRecapEmailProps

export default WeeklyRecapEmail
