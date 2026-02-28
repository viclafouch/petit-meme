import { ANNUAL_DISCOUNT_PERCENT, type BillingPeriod } from '@/constants/plan'
import { cn } from '@/lib/utils'

type BillingToggleParams = {
  billingPeriod: BillingPeriod
  onBillingPeriodChange: (period: BillingPeriod) => void
}

const TOGGLE_BUTTON_CLASS =
  'min-h-11 rounded-full px-5 py-2.5 text-sm font-medium transition-colors text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm'

const OPPOSITE_PERIOD = {
  monthly: 'yearly',
  yearly: 'monthly'
} as const satisfies Record<BillingPeriod, BillingPeriod>

export const BillingToggle = ({
  billingPeriod,
  onBillingPeriodChange
}: BillingToggleParams) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowUp'
    ) {
      event.preventDefault()
      onBillingPeriodChange(OPPOSITE_PERIOD[billingPeriod])
    }
  }

  return (
    <div
      className="flex rounded-full bg-muted p-1"
      role="radiogroup"
      aria-label="Période de facturation"
    >
      <button
        type="button"
        role="radio"
        aria-checked={billingPeriod === 'monthly'}
        tabIndex={billingPeriod === 'monthly' ? 0 : -1}
        onClick={() => {
          onBillingPeriodChange('monthly')
        }}
        onKeyDown={handleKeyDown}
        className={TOGGLE_BUTTON_CLASS}
      >
        Mensuel
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={billingPeriod === 'yearly'}
        tabIndex={billingPeriod === 'yearly' ? 0 : -1}
        onClick={() => {
          onBillingPeriodChange('yearly')
        }}
        onKeyDown={handleKeyDown}
        className={cn(TOGGLE_BUTTON_CLASS, 'flex items-center gap-2')}
      >
        Annuel
        <span className="amber-badge px-2 py-0.5">
          -{ANNUAL_DISCOUNT_PERCENT}%
        </span>
      </button>
    </div>
  )
}
