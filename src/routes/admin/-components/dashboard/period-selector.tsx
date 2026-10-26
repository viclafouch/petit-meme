import { useNavigate } from '@tanstack/react-router'
import {
  RadioToggleGroup,
  RadioToggleGroupItem
} from '~/components/ui/radio-toggle-group'
import {
  type DashboardPeriod,
  PERIOD_SCHEMA
} from '~/routes/admin/-server/dashboard'

const PERIOD_OPTIONS = [
  { value: '7d', label: '7j' },
  { value: '30d', label: '30j' },
  { value: '90d', label: '90j' },
  { value: 'all', label: 'Tout' }
] as const satisfies readonly { value: DashboardPeriod; label: string }[]

type PeriodSelectorProps = {
  period: DashboardPeriod
}

export const PeriodSelector = ({ period }: PeriodSelectorProps) => {
  const navigate = useNavigate()

  const handleValueChange = (nextPeriod: string) => {
    const result = PERIOD_SCHEMA.safeParse(nextPeriod)

    if (!result.success) {
      return
    }

    void navigate({
      to: '/admin',
      search: { period: result.data }
    })
  }

  return (
    <RadioToggleGroup
      value={period}
      onValueChange={handleValueChange}
      variant="outline"
      size="sm"
    >
      {PERIOD_OPTIONS.map((option) => {
        return (
          <RadioToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={`Période de ${option.label}`}
          >
            {option.label}
          </RadioToggleGroupItem>
        )
      })}
    </RadioToggleGroup>
  )
}
