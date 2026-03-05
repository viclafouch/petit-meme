import React from 'react'
import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { ANNUAL_DISCOUNT_PERCENT, type BillingPeriod } from '@/constants/plan'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

type BillingToggleParams = {
  billingPeriod: BillingPeriod
  onBillingPeriodChange: (period: BillingPeriod) => void
}

const OPPOSITE_PERIOD = {
  monthly: 'yearly',
  yearly: 'monthly'
} as const satisfies Record<BillingPeriod, BillingPeriod>

type ToggleOption = {
  value: BillingPeriod
  label: string
}

const getToggleOptions = (): ToggleOption[] => {
  return [
    { value: 'monthly', label: m.pricing_monthly() },
    { value: 'yearly', label: m.pricing_yearly() }
  ]
}

export const BillingToggle = ({
  billingPeriod,
  onBillingPeriodChange
}: BillingToggleParams) => {
  const prefersReducedMotion = useReducedMotion()
  const [hasInteracted, setHasInteracted] = React.useState(false)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowUp'
    ) {
      event.preventDefault()
      setHasInteracted(true)
      onBillingPeriodChange(OPPOSITE_PERIOD[billingPeriod])
    }
  }

  return (
    <LayoutGroup>
      <div
        className="relative flex rounded-full bg-muted p-1"
        role="radiogroup"
        aria-label={m.pricing_billing_period()}
      >
        {getToggleOptions().map((option) => {
          const isSelected = billingPeriod === option.value
          const isYearly = option.value === 'yearly'

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                setHasInteracted(true)
                onBillingPeriodChange(option.value)
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                'relative z-10 min-h-11 cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted',
                isSelected
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              )}
            >
              {isSelected ? (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 rounded-full bg-background shadow-sm"
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 400, damping: 30 }
                  }
                />
              ) : null}
              <span className="relative flex items-center gap-2">
                {option.label}
                {isYearly ? (
                  <motion.span
                    className="amber-badge px-2 py-0.5"
                    animate={{
                      scale:
                        isSelected && !prefersReducedMotion && hasInteracted
                          ? [1, 1.1, 1]
                          : 1
                    }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.3,
                      delay: prefersReducedMotion ? 0 : 0.15
                    }}
                  >
                    -{ANNUAL_DISCOUNT_PERCENT}%
                  </motion.span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
