import type React from 'react'
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  BILLING_PERIOD_LABELS,
  type BillingPeriod,
  type Plan
} from '@/constants/plan'
import { convertCentsToEuros, formatCentsToEuros } from '@/helpers/number'
import { cn } from '@/lib/utils'
import NumberFlow from '@number-flow/react'

type FeatureStatusConfig = {
  icon: React.ElementType
  className: string
  srLabel: string
}

const FEATURE_STATUS_CONFIG = {
  included: {
    icon: CheckCircle2,
    className: 'text-green-400',
    srLabel: 'Inclus'
  },
  limited: {
    icon: MinusCircle,
    className: 'text-yellow-400',
    srLabel: 'Limité'
  },
  // eslint-disable-next-line camelcase -- maps to PlanFeature status value
  not_included: {
    icon: XCircle,
    className: 'text-red-400',
    srLabel: 'Non inclus'
  }
} as const satisfies Record<
  Plan['features'][number]['status'],
  FeatureStatusConfig
>

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
  const {
    icon: Icon,
    className,
    srLabel
  } = FEATURE_STATUS_CONFIG[feature.status]

  return (
    <li className="flex gap-3">
      <Icon
        size={20}
        className={cn('my-auto shrink-0', className)}
        aria-hidden
      />
      <span className="sr-only">{srLabel} :</span>
      <p className="pt-0.5 text-foreground">
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
  const periodLabel = BILLING_PERIOD_LABELS[billingPeriod]
  const isFree = currentPricing.priceInCents === 0
  const isHighlighted = isExclusive && !isActive
  const hasYearlyBreakdown = isExclusive && billingPeriod === 'yearly'

  return (
    <Card
      data-highlighted={isHighlighted || undefined}
      className={cn(
        'grid row-span-4 grid-rows-subgrid py-8',
        'data-highlighted:animate-background-shine data-highlighted:border-amber-400/20 data-highlighted:bg-background data-highlighted:bg-size-[200%_100%] data-highlighted:transition-colors dark:data-highlighted:bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)]',
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
              <span className="sr-only">Plan recommandé : </span>
              Populaire
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-1" aria-live="polite">
          {isFree ? (
            <p className="text-4xl font-bold">Gratuit</p>
          ) : (
            <>
              <NumberFlow
                value={convertCentsToEuros(currentPricing.priceInCents)}
                format={EURO_FORMAT_OPTIONS}
                locales="fr"
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
              className="text-sm text-amber-400/80"
            >
              soit ~
              {formatCentsToEuros(
                Math.round(currentPricing.priceInCents / MONTHS_IN_YEAR),
                { minimumFractionDigits: 2 }
              )}
              /mois
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
        <ul className="flex flex-col gap-3.5" aria-label="Fonctionnalités">
          {features.map((feature) => {
            return <FeatureItem key={feature.label} feature={feature} />
          })}
        </ul>
      </CardContent>
      <CardFooter className="items-end">
        {isActive ? (
          <Button
            className="w-full text-green-500 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            size="xl"
            variant="outline"
            aria-label="Plan actuellement actif"
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
            Actif
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
            {isExclusive ? 'Passer à Premium' : 'Choisir ce plan'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
