import React from 'react'
import { Crown } from 'lucide-react'
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
import { PREMIUM_PLAN_PRICING } from '~/constants/plan'
import { formatCentsToEuros } from '~/helpers/number'
import { dismissPremiumReminder } from '~/hooks/use-premium-reminder'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'

const handleOpenChange = (
  value: boolean,
  onOpenChange: (open: boolean) => void
) => {
  if (!value) {
    dismissPremiumReminder()
  }
  onOpenChange(value)
}

export const PremiumReminderDialog = ({
  open,
  onOpenChange
}: WithDialog<Record<string, never>>) => {
  const ctaRef = React.useRef<HTMLAnchorElement>(null)
  const monthlyPrice = formatCentsToEuros(
    PREMIUM_PLAN_PRICING.monthly.priceInCents,
    { locale: getLocale() }
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        handleOpenChange(value, onOpenChange)
      }}
    >
      <DialogContent
        className="max-w-sm overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ctaRef.current?.focus()
        }}
      >
        <div className="relative flex flex-col items-center gap-4 px-6 pb-6 pt-8">
          <div className="absolute inset-0 bg-linear-to-b from-amber-500/10 via-transparent to-transparent" />
          <div className="relative size-24 shrink-0">
            <img
              src="/images/roll-safe.png"
              alt=""
              aria-hidden="true"
              width={96}
              height={96}
              className="size-full object-contain drop-shadow-lg"
            />
          </div>
          <div className="relative flex flex-col items-center gap-1.5">
            <DialogHeader className="gap-1 text-center">
              <DialogTitle className="flex items-center justify-center gap-2 text-lg font-bold tracking-tight">
                <Crown
                  className="size-5 text-amber-500 shrink-0"
                  aria-hidden="true"
                />
                {m.premium_reminder_title()}
              </DialogTitle>
              <DialogDescription className="text-sm text-center text-balance">
                {m.premium_reminder_description({ price: monthlyPrice })}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="relative flex flex-col gap-2 w-full pt-1">
            <Button asChild size="lg" className="w-full">
              <Link
                ref={ctaRef}
                to="/pricing"
                onClick={() => {
                  handleOpenChange(false, onOpenChange)
                }}
              >
                <Crown className="size-4" aria-hidden="true" />
                {m.nav_upgrade_premium()}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground"
              onClick={() => {
                handleOpenChange(false, onOpenChange)
              }}
            >
              {m.common_not_now()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
