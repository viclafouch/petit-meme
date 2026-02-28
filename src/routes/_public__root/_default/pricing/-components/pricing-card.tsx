import type React from 'react'
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
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
import { formatCentsToEuros } from '@/helpers/number'
import { cn } from '@/lib/utils'

const STATUS_ICON_BY_FEATURE_STATUS = {
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
  { icon: React.ElementType; className: string; srLabel: string }
>

type FeatureItemParams = {
  feature: Plan['features'][number]
}

const FeatureItem = ({ feature }: FeatureItemParams) => {
  const {
    icon: Icon,
    className,
    srLabel
  } = STATUS_ICON_BY_FEATURE_STATUS[feature.status]

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
}

export const PricingCard = ({
  title,
  pricing,
  description,
  features,
  isExclusive = false,
  isActive,
  billingPeriod,
  onChangePlan
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
        'flex flex-1 flex-col justify-between gap-8 py-8',
        'data-highlighted:animate-background-shine data-highlighted:border-amber-400/20 data-highlighted:bg-background data-highlighted:bg-size-[200%_100%] data-highlighted:transition-colors dark:data-highlighted:bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)]'
      )}
    >
      <div className="flex flex-col gap-6">
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
          <div className="flex items-baseline gap-1">
            <p className="text-4xl font-bold">
              {isFree
                ? 'Gratuit'
                : formatCentsToEuros(currentPricing.priceInCents)}
            </p>
            {isFree ? null : (
              <span className="text-muted-foreground">{periodLabel}</span>
            )}
          </div>
          <p
            className={cn('text-sm', {
              'text-amber-400/80': hasYearlyBreakdown,
              invisible: !hasYearlyBreakdown
            })}
            aria-hidden={!hasYearlyBreakdown}
          >
            soit ~
            {formatCentsToEuros(Math.round(currentPricing.priceInCents / 12), {
              minimumFractionDigits: 2
            })}
            /mois
          </p>
          <CardDescription className="pt-2 text-base leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3.5" aria-label="Fonctionnalités">
            {features.map((feature) => {
              return <FeatureItem key={feature.label} feature={feature} />
            })}
          </ul>
        </CardContent>
      </div>
      <CardFooter>
        {isActive ? (
          <Button
            className="w-full text-green-500 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            size="xl"
            variant="outline"
            aria-label="Plan actuellement actif"
            aria-disabled
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
