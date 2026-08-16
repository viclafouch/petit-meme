import type React from 'react'
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import {
  type BillingPeriod,
  getBillingPeriodLabel,
  type Plan
} from '~/constants/plan'
import { convertCentsToEuros, formatCentsToEuros } from '~/helpers/number'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'

type FeatureStatusStaticConfig = {
  icon: React.ElementType
  className: string
}

const FEATURE_STATUS_STATIC_CONFIG = {
  included: { icon: CheckCircle2, className: 'text-success-foreground' },
  limited: { icon: MinusCircle, className: 'text-warning-foreground' },
  not_included: { icon: XCircle, className: 'text-destructive' }
} as const satisfies Record<
  Plan['features'][number]['status'],
  FeatureStatusStaticConfig
>

const getFeatureStatusSrLabel = (
  status: Plan['features'][number]['status']
) => {
  if (status === 'included') {
    return m.pricing_sr_included()
  }

  if (status === 'limited') {
    return m.pricing_sr_limited()
  }

  return m.pricing_sr_not_included()
}

const MONTHS_IN_YEAR = 12

const EURO_FORMAT_OPTIONS = {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  trailingZeroDisplay: 'stripIfInteger'
} as const satisfies Intl.NumberFormatOptions

type FeatureItemParams = {
  feature: Plan['features'][number]
}

const FeatureItem = ({ feature }: FeatureItemParams) => {
  const { icon: Icon, className } = FEATURE_STATUS_STATIC_CONFIG[feature.status]

  return (
    <li className="flex items-start gap-3">
      <Icon
        size={20}
        className={cn('mt-0.5 shrink-0', className)}
        aria-hidden
      />
      <span className="sr-only">
        {getFeatureStatusSrLabel(feature.status)} :
      </span>
      <p className="text-foreground">
        {feature.label}{' '}
        {feature.note ? (
          <span className="text-sm text-muted-foreground">
            ({feature.note})
          </span>
        ) : null}
      </p>
    </li>
  )
}

type PricingCardParams = Plan & {
  billingPeriod: BillingPeriod
  isActive: boolean
  onChangePlan: () => void
  className?: string
}

export const PricingCard = ({
  title,
  pricing,
  description,
  features,
  isExclusive = false,
  isActive,
  billingPeriod,
  onChangePlan,
  className
}: PricingCardParams) => {
  const currentPricing = pricing[billingPeriod]
  const periodLabel = getBillingPeriodLabel(billingPeriod)
  const isFree = currentPricing.priceInCents === 0
  const isHighlighted = isExclusive && !isActive
  const hasYearlyBreakdown = isExclusive && billingPeriod === 'yearly'

  return (
    <Card
      data-highlighted={isHighlighted || undefined}
      className={cn(
        'grid row-span-4 grid-rows-subgrid py-8',
        'data-highlighted:animate-background-shine data-highlighted:border-amber-700/25 data-highlighted:bg-[linear-gradient(110deg,#fff,45%,#fffbeb,55%,#fff)] data-highlighted:bg-size-[200%_100%] data-highlighted:transition-colors dark:data-highlighted:border-amber-400/20 dark:data-highlighted:bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)]',
        className
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-foreground">
            <h2>{title}</h2>
          </CardTitle>
          {isHighlighted ? (
            <span className="amber-badge px-3 py-1">
              <span className="sr-only">{m.pricing_popular_sr()}</span>
              {m.pricing_popular()}
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-1" aria-live="polite">
          {isFree ? (
            <p className="text-4xl font-bold">{m.pricing_free_label()}</p>
          ) : (
            <>
              <NumberFlow
                value={convertCentsToEuros(currentPricing.priceInCents)}
                format={EURO_FORMAT_OPTIONS}
                locales={getLocale()}
                className="text-4xl font-bold"
              />
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={billingPeriod}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
                >
                  {periodLabel}
                </motion.span>
              </AnimatePresence>
            </>
          )}
        </div>
        <AnimatePresence initial={false}>
          {hasYearlyBreakdown ? (
            <motion.p
              initial={{ opacity: 0, translateX: -8 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: -8 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-amber-700 dark:text-amber-400/80"
            >
              {m.pricing_yearly_breakdown({
                price: formatCentsToEuros(
                  Math.round(currentPricing.priceInCents / MONTHS_IN_YEAR),
                  { locale: getLocale(), minimumFractionDigits: 2 }
                )
              })}
            </motion.p>
          ) : (
            <p className="invisible text-sm" aria-hidden>
              &nbsp;
            </p>
          )}
        </AnimatePresence>
      </CardHeader>
      <CardDescription className="px-6 text-base leading-relaxed">
        {description}
      </CardDescription>
      <CardContent>
        <ul
          className="flex flex-col gap-3.5"
          aria-label={m.pricing_features_label()}
        >
          {features.map((feature) => {
            return <FeatureItem key={feature.label} feature={feature} />
          })}
        </ul>
      </CardContent>
      <CardFooter className="items-end">
        {isActive ? (
          <Button
            className="w-full text-success-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
            size="xl"
            variant="outline"
            aria-label={m.pricing_active_plan_sr()}
            aria-disabled
            onClick={(event) => {
              event.preventDefault()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
              }
            }}
          >
            {m.pricing_active()}
          </Button>
        ) : (
          <Button
            onClick={(event) => {
              event.preventDefault()
              onChangePlan()
            }}
            size="xl"
            className="w-full"
            variant={isExclusive ? 'default' : 'secondary'}
          >
            {isExclusive ? m.nav_upgrade_premium() : m.pricing_choose_plan()}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
