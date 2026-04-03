import { CheckCircle2, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { WithDialog } from '~/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/animate-ui/radix/dialog'
import { Button } from '~/components/ui/button'
import { getPremiumPlan, PREMIUM_PLAN_PRICING } from '~/constants/plan'
import { formatCentsToEuros } from '~/helpers/number'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'

type PremiumUpsellDialogParams = {
  title: string
  description: string
  imageUrl: string
  secondaryAction?: React.ReactNode
}

export const PremiumUpsellDialog = ({
  open,
  onOpenChange,
  title,
  description,
  imageUrl,
  secondaryAction
}: WithDialog<PremiumUpsellDialogParams>) => {
  const premiumPlan = getPremiumPlan()
  const monthlyPrice = formatCentsToEuros(
    PREMIUM_PLAN_PRICING.monthly.priceInCents,
    { locale: getLocale() }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="h-60 w-full object-cover object-top"
        />
        <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
              <Sparkles
                className="size-6 text-amber-500 shrink-0"
                aria-hidden="true"
              />
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {description}
            </DialogDescription>
          </DialogHeader>
          <ul
            className="flex flex-col gap-2.5"
            aria-label={m.watermark_upsell_features_label()}
          >
            {premiumPlan.features.map((feature) => {
              return (
                <li key={feature.label} className="flex items-center gap-2.5">
                  <CheckCircle2
                    size={16}
                    className="text-success-foreground shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-foreground">
                    {feature.label}
                    {feature.note ? (
                      <span className="text-muted-foreground">
                        {' '}
                        ({feature.note})
                      </span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-muted-foreground">
            {m.watermark_upsell_price_from({ price: monthlyPrice })}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link
                to="/pricing"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {m.nav_upgrade_premium()}
              </Link>
            </Button>
            {secondaryAction}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
