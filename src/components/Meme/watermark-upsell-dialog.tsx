import React from 'react'
import { CheckCircle2, Download, Share2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { WithDialog } from '@/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/animate-ui/radix/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/spinner'
import type { MemeWithVideo } from '@/constants/meme'
import { getPremiumPlan, PREMIUM_PLAN_PRICING } from '@/constants/plan'
import { getErrorMessage } from '@/helpers/error'
import { formatCentsToEuros } from '@/helpers/number'
import type { MemeExportMode } from '@/hooks/use-meme-export'
import { captureWithFeature } from '@/lib/sentry'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime'
import { shareMeme, trackMemeAction } from '@/server/meme'
import { downloadBlob, shareBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

type WatermarkUpsellDialogParams = {
  meme: Pick<MemeWithVideo, 'id' | 'title'>
  mode: MemeExportMode
}

const getTitle = (mode: MemeExportMode) => {
  if (mode === 'download') {
    return m.watermark_upsell_title_download()
  }

  return m.watermark_upsell_title_share()
}

const getConfirmLabel = (mode: MemeExportMode) => {
  if (mode === 'download') {
    return m.watermark_download_with_watermark()
  }

  return m.watermark_share_with_watermark()
}

const CONFIRM_ICONS = {
  download: Download,
  share: Share2
} as const satisfies Record<MemeExportMode, React.ElementType>

export const WatermarkUpsellDialog = ({
  open,
  onOpenChange,
  meme,
  mode
}: WithDialog<WatermarkUpsellDialogParams>) => {
  const premiumPlan = getPremiumPlan()
  const monthlyPrice = formatCentsToEuros(
    PREMIUM_PLAN_PRICING.monthly.priceInCents,
    { locale: getLocale() }
  )

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await shareMeme({ data: meme.id })
      const blob = await response.blob()

      if (mode === 'download') {
        downloadBlob(blob, meme.title)

        return true
      }

      return shareBlob(blob, meme.title)
    },
    onSuccess: (wasExported) => {
      if (wasExported) {
        onOpenChange(false)
        void trackMemeAction({ data: { memeId: meme.id, action: mode } })
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
      captureWithFeature(error, mode)
    }
  })

  const ConfirmIcon = CONFIRM_ICONS[mode]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <img
          src="/images/premium-upsell.webp"
          alt=""
          aria-hidden
          className="h-60 w-full object-cover object-top"
        />
        <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
              <Sparkles
                className="size-6 text-amber-500 shrink-0"
                aria-hidden
              />
              {getTitle(mode)}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {m.watermark_upsell_description()}
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
                    aria-hidden
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
                <Sparkles className="size-4" aria-hidden />
                {m.nav_upgrade_premium()}
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={exportMutation.isPending}
              onClick={() => {
                exportMutation.mutate()
              }}
              aria-busy={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <LoadingSpinner className="size-4" aria-hidden="true" />
              ) : (
                <ConfirmIcon className="size-4" aria-hidden="true" />
              )}
              {getConfirmLabel(mode)}
            </Button>
            {exportMutation.isPending ? (
              <p role="status" className="sr-only">
                {m.common_loading()}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
