import React from 'react'
import { curveMonotoneX } from 'd3-shape'
import { BrainCircuit, Download, Eye, Share2, Sparkles } from 'lucide-react'
import { defineChart, lineY } from '@tanstack/charts'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { Chart } from '@tanstack/charts/react'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleUtc } from '@tanstack/charts/scales/time'
import { tooltip } from '@tanstack/charts/tooltip'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import { formatDate } from '~/helpers/date'
import { getLocale, type Locale } from '~/paraglide/runtime'
import type {
  ChartDataPoint,
  DashboardPeriod
} from '~/server/admin/dashboard/dashboard.functions'
import type { IconConfig } from './types'

const HIDDEN_METRIC_OPACITY = 0.35

type MetricKey = keyof Omit<ChartDataPoint, 'date'>

const METRIC_KEYS = [
  'views',
  'studioGenerations',
  'shares',
  'downloads',
  'signups',
  'aiSearches'
] as const satisfies readonly MetricKey[]

const CHART_CONFIG = {
  views: { label: 'Vues', color: 'var(--chart-1)' },
  studioGenerations: { label: 'Générations', color: 'var(--chart-3)' },
  shares: { label: 'Partages', color: 'var(--chart-5)' },
  downloads: { label: 'Téléchargements', color: 'var(--chart-6)' },
  signups: { label: 'Nouveaux utilisateurs', color: 'var(--chart-2)' },
  aiSearches: { label: 'Recherches IA', color: 'var(--chart-7)' }
} as const satisfies Record<MetricKey, { label: string; color: string }>

const CHART_HEIGHT = 250

const METRIC_COLORS = METRIC_KEYS.map((key) => {
  return CHART_CONFIG[key].color
})

type TrendRow = {
  date: Date
  metric: MetricKey
  value: number
}

const METRIC_SUMMARIES = [
  {
    key: 'views',
    label: 'Vues',
    icon: <Eye className="size-4" aria-hidden />
  },
  {
    key: 'studioGenerations',
    label: 'Générations',
    icon: <Sparkles className="size-4" aria-hidden />
  },
  {
    key: 'shares',
    label: 'Partages',
    icon: <Share2 className="size-4" aria-hidden />
  },
  {
    key: 'downloads',
    label: 'Téléchargements',
    icon: <Download className="size-4" aria-hidden />
  },
  {
    key: 'aiSearches',
    label: 'Recherches IA',
    icon: <BrainCircuit className="size-4" aria-hidden />
  }
] as const satisfies readonly IconConfig<MetricKey>[]

function computeMetricTotals(
  data: ChartDataPoint[]
): Record<MetricKey, number> {
  const sumOf = (key: MetricKey) => {
    return data.reduce((sum, point) => {
      return sum + point[key]
    }, 0)
  }

  return {
    views: sumOf('views'),
    studioGenerations: sumOf('studioGenerations'),
    shares: sumOf('shares'),
    downloads: sumOf('downloads'),
    signups: sumOf('signups'),
    aiSearches: sumOf('aiSearches')
  }
}

const PERIOD_DESCRIPTIONS = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  all: 'Depuis le lancement'
} as const satisfies Record<DashboardPeriod, string>

const DAY_MONTH_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
}

const MONTH_YEAR_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
}

const DATE_LONG_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
}

function formatXAxisDate(date: Date, period: DashboardPeriod, locale: Locale) {
  if (period === 'all') {
    return formatDate(date, locale, MONTH_YEAR_OPTIONS)
  }

  return formatDate(date, locale, DAY_MONTH_OPTIONS)
}

function toTrendRows(data: ChartDataPoint[], hiddenMetrics: Set<MetricKey>) {
  const visibleKeys = METRIC_KEYS.filter((key) => {
    return !hiddenMetrics.has(key)
  })

  return visibleKeys.flatMap((key) => {
    return data.map((point): TrendRow => {
      return {
        date: new Date(point.date),
        metric: key,
        value: point[key]
      }
    })
  })
}

type TrendsDefinitionParams = {
  rows: TrendRow[]
  period: DashboardPeriod
  locale: Locale
}

function defineTrendsChart({ rows, period, locale }: TrendsDefinitionParams) {
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'date',
        y: 'value',
        z: 'metric',
        strokeWidth: 2,
        curve: d3Curve(curveMonotoneX)
      })
    ],
    scales: {
      x: {
        scale: scaleUtc,
        axis: {
          line: false,
          ticks: {
            size: 0,
            format: (date) => {
              return formatXAxisDate(date, period, locale)
            }
          }
        }
      },
      y: { scale: scaleLinear, nice: true, grid: true, axis: false }
    },
    color: { domain: METRIC_KEYS, range: METRIC_COLORS },
    focus: 'group-x',
    tooltip: {
      use: tooltip,
      anchor: 'group-center',
      items: [
        {
          channel: 'x',
          label: 'Date',
          text: (point) => {
            return formatDate(point.xValue, locale, DATE_LONG_OPTIONS)
          }
        },
        {
          channel: 'y',
          label: 'Valeur',
          text: (point) => {
            return point.yValue.toLocaleString(locale)
          }
        },
        {
          channel: 'group',
          label: 'Métrique',
          text: (point) => {
            return CHART_CONFIG[point.datum.metric].label
          }
        }
      ]
    }
  })
}

type TrendsChartProps = {
  data: ChartDataPoint[]
  period: DashboardPeriod
}

export const TrendsChart = ({ data, period }: TrendsChartProps) => {
  const locale = getLocale()
  const [hiddenMetrics, setHiddenMetrics] = React.useState<Set<MetricKey>>(
    new Set()
  )

  const totals = computeMetricTotals(data)

  const definition = React.useMemo(() => {
    return defineTrendsChart({
      rows: toTrendRows(data, hiddenMetrics),
      period,
      locale
    })
  }, [data, hiddenMetrics, period, locale])

  const handleLegendClick = (metricKey: MetricKey) => {
    setHiddenMetrics((prev) => {
      const next = new Set(prev)

      if (next.has(metricKey)) {
        next.delete(metricKey)
      } else {
        next.add(metricKey)
      }

      return next
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tendances</CardTitle>
          <CardDescription>{PERIOD_DESCRIPTIONS[period]}</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset
            className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 pb-4"
            aria-label="Filtres de métriques du graphique"
          >
            {METRIC_KEYS.map((key) => {
              const isHidden = hiddenMetrics.has(key)

              return (
                <button
                  key={key}
                  type="button"
                  className="flex items-center gap-1.5 text-xs transition-opacity"
                  style={{ opacity: isHidden ? HIDDEN_METRIC_OPACITY : 1 }}
                  onClick={() => {
                    handleLegendClick(key)
                  }}
                  aria-label={`${isHidden ? 'Afficher' : 'Masquer'} ${CHART_CONFIG[key].label}`}
                  aria-pressed={!isHidden}
                >
                  <span
                    className="size-2 shrink-0 rounded-swatch"
                    style={{ backgroundColor: CHART_CONFIG[key].color }}
                  />
                  {CHART_CONFIG[key].label}
                </button>
              )
            })}
          </fieldset>
          <Chart
            definition={definition}
            height={CHART_HEIGHT}
            className="chart-tooltip-popover text-xs text-muted-foreground"
            ariaLabel={`Graphique des tendances, ${PERIOD_DESCRIPTIONS[period]}`}
          />
          <p className="sr-only">
            {PERIOD_DESCRIPTIONS[period]} :{' '}
            {METRIC_SUMMARIES.map((metric) => {
              return `${metric.label} : ${totals[metric.key].toLocaleString(locale)}`
            }).join(', ')}
          </p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRIC_SUMMARIES.map((metric) => {
          return (
            <div
              key={metric.key}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {metric.label}
                </span>
                <span className="text-muted-foreground">{metric.icon}</span>
              </div>
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                {totals[metric.key].toLocaleString(locale)}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
