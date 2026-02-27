import React from 'react'
import { Download, Eye, Share2, Sparkles } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart'
import type { ChartDataPoint, DashboardPeriod } from '@admin/-server/dashboard'
import type { IconConfig } from './types'

type MetricKey = keyof Omit<ChartDataPoint, 'date'>

const METRIC_KEYS = [
  'views',
  'studioGenerations',
  'shares',
  'downloads'
] as const satisfies readonly MetricKey[]

const CHART_CONFIG = {
  views: { label: 'Vues', color: 'var(--chart-1)' },
  studioGenerations: { label: 'Générations', color: 'var(--chart-3)' },
  shares: { label: 'Partages', color: 'var(--chart-5)' },
  downloads: { label: 'Téléchargements', color: 'var(--chart-6)' }
} as const satisfies ChartConfig

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
  }
] as const satisfies readonly IconConfig<MetricKey>[]

function computeMetricTotals(data: ChartDataPoint[]) {
  return METRIC_KEYS.reduce(
    (result, key) => {
      return {
        ...result,
        [key]: data.reduce((sum, point) => {
          return sum + point[key]
        }, 0)
      }
    },
    {} as Record<MetricKey, number>
  )
}

const PERIOD_DESCRIPTIONS = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  all: 'Depuis le lancement'
} as const satisfies Record<DashboardPeriod, string>

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
})

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
})

const TOOLTIP_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})

function formatXAxisDate(value: string, period: DashboardPeriod) {
  const date = new Date(value)

  if (period === 'all') {
    return MONTH_YEAR_FORMATTER.format(date)
  }

  return DAY_MONTH_FORMATTER.format(date)
}

function formatTooltipDate(value: string) {
  return TOOLTIP_FORMATTER.format(new Date(value))
}

type TrendsChartParams = {
  data: ChartDataPoint[]
  period: DashboardPeriod
}

export const TrendsChart = ({ data, period }: TrendsChartParams) => {
  const [hiddenMetrics, setHiddenMetrics] = React.useState<Set<MetricKey>>(
    () => {
      return new Set()
    }
  )

  const totals = computeMetricTotals(data)

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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4">
            {METRIC_KEYS.map((key) => {
              const isHidden = hiddenMetrics.has(key)

              return (
                <button
                  key={key}
                  type="button"
                  className="flex items-center gap-1.5 text-xs transition-opacity"
                  style={{ opacity: isHidden ? 0.35 : 1 }}
                  onClick={() => {
                    return handleLegendClick(key)
                  }}
                  aria-label={`${isHidden ? 'Afficher' : 'Masquer'} ${CHART_CONFIG[key].label}`}
                  aria-pressed={!isHidden}
                >
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: CHART_CONFIG[key].color }}
                  />
                  {CHART_CONFIG[key].label}
                </button>
              )
            })}
          </div>
          <ChartContainer
            config={CHART_CONFIG}
            className="aspect-auto h-62.5 w-full"
          >
            <LineChart
              data={data}
              margin={{ top: 0, right: 12, bottom: 0, left: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => {
                  return formatXAxisDate(value, period)
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="min-w-48"
                    labelFormatter={(value) => {
                      return formatTooltipDate(String(value))
                    }}
                    indicator="dot"
                  />
                }
              />
              {METRIC_KEYS.map((key) => {
                return (
                  <Line
                    key={key}
                    dataKey={key}
                    type="monotone"
                    stroke={`var(--color-${key})`}
                    strokeWidth={2}
                    dot={false}
                    hide={hiddenMetrics.has(key)}
                  />
                )
              })}
            </LineChart>
          </ChartContainer>
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
                {totals[metric.key].toLocaleString('fr-FR')}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
