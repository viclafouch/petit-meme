import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useNavigate } from '@tanstack/react-router'

import type { DashboardPeriod } from '~admin/-server/dashboard'

const PERIOD_OPTIONS = [
  { value: '7d', label: '7j' },
  { value: '30d', label: '30j' },
  { value: '90d', label: '90j' },
  { value: 'all', label: 'Tout' }
] as const satisfies readonly { value: DashboardPeriod; label: string }[]

type PeriodSelectorParams = {
  period: DashboardPeriod
}

export const PeriodSelector = ({ period }: PeriodSelectorParams) => {
  const navigate = useNavigate()

  const handleValueChange = (value: string) => {
    if (!value) {
      return
    }

    void navigate({
      to: '/admin',
      search: { period: value as DashboardPeriod }
    })
  }

  return (
    <ToggleGroup
      type="single"
      value={period}
      onValueChange={handleValueChange}
      variant="outline"
      size="sm"
    >
      {PERIOD_OPTIONS.map((option) => {
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={`Période de ${option.label}`}
          >
            {option.label}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
