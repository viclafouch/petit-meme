import React from 'react'
import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { RadioGroup } from 'radix-ui'
import { ANNUAL_DISCOUNT_PERCENT, type BillingPeriod } from '~/constants/plan'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

type BillingToggleProps = {
  billingPeriod: BillingPeriod
  onBillingPeriodChange: (period: BillingPeriod) => void
}

const BADGE_PULSE_SCALE = 1.1
const BADGE_PULSE_DURATION = 0.3
const BADGE_PULSE_DELAY = 0.15

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
}: BillingToggleProps) => {
  const isReducedMotion = useReducedMotion()
  const [hasInteracted, setHasInteracted] = React.useState(false)

  return (
    <LayoutGroup>
      <RadioGroup.Root
        value={billingPeriod}
        className="relative flex rounded-full bg-muted p-1"
        aria-label={m.pricing_billing_period()}
      >
        {getToggleOptions().map((option) => {
          const isSelected = billingPeriod === option.value
          const isYearly = option.value === 'yearly'

          return (
            <RadioGroup.Item
              key={option.value}
              value={option.value}
              onClick={() => {
                setHasInteracted(true)
                onBillingPeriodChange(option.value)
              }}
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
                    isReducedMotion
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
                        isSelected && !isReducedMotion && hasInteracted
                          ? [1, BADGE_PULSE_SCALE, 1]
                          : 1
                    }}
                    transition={{
                      duration: isReducedMotion ? 0 : BADGE_PULSE_DURATION,
                      delay: isReducedMotion ? 0 : BADGE_PULSE_DELAY
                    }}
                  >
                    -{ANNUAL_DISCOUNT_PERCENT}%
                  </motion.span>
                ) : null}
              </span>
            </RadioGroup.Item>
          )
        })}
      </RadioGroup.Root>
    </LayoutGroup>
  )
}
