import { ArrowDown, ArrowUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { computePercentChange } from '@/helpers/number'
import type { KpiData } from '@/server/admin/dashboard'

type KpiCardParams = {
  data: KpiData
  label: string
  icon: React.ReactNode
}

type KpiDeltaParams = {
  data: KpiData
}

const KpiDelta = ({ data }: KpiDeltaParams) => {
  const isNew = data.previous === 0 && data.current > 0

  if (isNew) {
    return (
      <Badge variant="success" size="sm">
        Nouveau
      </Badge>
    )
  }

  const delta = computePercentChange(data.current, data.previous)

  if (delta === null) {
    return null
  }

  const isPositive = delta >= 0

  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium tabular-nums ${isPositive ? 'text-success-foreground' : 'text-destructive-foreground'}`}
    >
      {isPositive ? (
        <ArrowUp className="size-3" aria-hidden />
      ) : (
        <ArrowDown className="size-3" aria-hidden />
      )}
      {Math.abs(delta)}%
    </span>
  )
}

export const KpiCard = ({ data, label, icon }: KpiCardParams) => {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tabular-nums tracking-tight">
          {data.current.toLocaleString('fr-FR')}
        </span>
        <KpiDelta data={data} />
      </div>
    </div>
  )
}
