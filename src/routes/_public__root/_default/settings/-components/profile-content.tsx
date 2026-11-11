import React from 'react'
import { CreditCard, Download, Key, Sparkles, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useStripeCheckout } from '~/components/premium/use-stripe-checkout'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { LoadingButton } from '~/components/ui/loading-button'
import { Separator } from '~/components/ui/separator'
import { DeleteAccountDialog } from '~/components/user/delete-account-dialog'
import { UpdatePasswordDialog } from '~/components/user/update-password-dialog'
import { getFreePlan, getPremiumPlan } from '~/constants/plan'
import { matchIsPremiumGranted, type SessionUser } from '~/helpers/role'
import {
  formatSubscriptionEnding,
  getSubscriptionDisplayInfo,
  getSubscriptionEnding,
  matchIsCancellationPending
} from '~/helpers/subscription'
import { downloadBlob } from '~/lib/download'
import { captureWithFeature } from '~/lib/sentry'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import type { ActiveSubscription } from '~/server/subscription/subscription.functions'
import { exportUserData } from '~/server/user/user.functions'

const SETTINGS_ROW_CLASS_NAME =
  'flex md:items-center justify-between gap-6 flex-col md:flex-row'

type ProfileContentProps = {
  user: SessionUser
  activeSubscription: ActiveSubscription | null
}

type SubscriptionRowProps = {
  user: SessionUser
  activeSubscription: ActiveSubscription | null
}

const SubscriptionRow = ({
  user,
  activeSubscription
}: SubscriptionRowProps) => {
  const { goToBillingPortal } = useStripeCheckout()

  if (activeSubscription) {
    const endingText = formatSubscriptionEnding(
      getSubscriptionEnding(activeSubscription),
      getLocale()
    )

    return (
      <div className={SETTINGS_ROW_CLASS_NAME}>
        <div className="space-y-1">
          <Label className="text-base">
            {m.settings_current_subscription()}
          </Label>
          <p className="text-muted-foreground text-sm">
            {getPremiumPlan().title} -{' '}
            {
              getSubscriptionDisplayInfo({
                billingInterval: activeSubscription.billingInterval,
                locale: getLocale()
              }).displayPrice
            }
            {endingText ? (
              <>
                {' '}
                - <span className="text-info">{endingText}</span>
              </>
            ) : null}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={(event) => {
            event.preventDefault()
            void goToBillingPortal()
          }}
        >
          <CreditCard />
          {m.nav_manage_subscription()}
        </Button>
      </div>
    )
  }

  if (matchIsPremiumGranted(user)) {
    return (
      <div className={SETTINGS_ROW_CLASS_NAME}>
        <div className="space-y-1">
          <Label className="text-base">
            {m.settings_current_subscription()}
          </Label>
          <p className="text-muted-foreground text-sm">
            {getPremiumPlan().title} -{' '}
            <span className="text-info">{m.premium_granted_for_life()}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={SETTINGS_ROW_CLASS_NAME}>
      <div className="space-y-1">
        <Label className="text-base">{m.settings_current_subscription()}</Label>
        <p className="text-muted-foreground text-sm">
          {getFreePlan().title} - {m.pricing_free_label()}
        </p>
      </div>
      <Link
        to="/pricing"
        className={cn(
          buttonVariants({
            className:
              'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-400 dark:hover:bg-amber-400/25'
          })
        )}
      >
        <Sparkles />
        {m.nav_upgrade_premium()}
      </Link>
    </div>
  )
}

export const ProfileContent = ({
  user,
  activeSubscription
}: ProfileContentProps) => {
  const [isUpdatePasswordOpened, setIsUpdatePasswordOpened] =
    React.useState(false)
  const [isDeleteAccountOpened, setIsDeleteAccountOpened] =
    React.useState(false)

  const exportMutation = useMutation({
    mutationFn: async () => {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })
      const filename = `${m.settings_data_export_filename()}.json`
      downloadBlob(blob, filename)
    },
    onSuccess: () => {
      toast.success(m.settings_data_exported())
    },
    onError: (error) => {
      captureWithFeature(error, 'data-export')
      toast.error(m.settings_data_export_error())
    }
  })

  return (
    <>
      <UpdatePasswordDialog
        open={isUpdatePasswordOpened}
        onOpenChange={setIsUpdatePasswordOpened}
        user={user}
      />
      <DeleteAccountDialog
        open={isDeleteAccountOpened}
        onOpenChange={setIsDeleteAccountOpened}
        user={user}
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{m.settings_account_title()}</CardTitle>
            <CardDescription>
              {m.settings_account_description()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SubscriptionRow
              user={user}
              activeSubscription={activeSubscription}
            />
            <Separator />
            <div className={SETTINGS_ROW_CLASS_NAME}>
              <div className="space-y-1">
                <Label className="text-base">{m.common_password()}</Label>
                <p className="text-muted-foreground text-sm">
                  {m.settings_password_description()}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setIsUpdatePasswordOpened(true)
                }}
              >
                <Key />
                {m.settings_change_password()}
              </Button>
            </div>
            <Separator />
            <div className={SETTINGS_ROW_CLASS_NAME}>
              <div className="space-y-1">
                <Label className="text-base">{m.settings_data_label()}</Label>
                <p className="text-muted-foreground text-sm">
                  {m.settings_data_description()}
                </p>
              </div>
              <LoadingButton
                variant="outline"
                isLoading={exportMutation.isPending}
                onClick={() => {
                  exportMutation.mutate()
                }}
              >
                <Download />
                {m.settings_download_data()}
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">
              {m.settings_danger_zone()}
            </CardTitle>
            <CardDescription>{m.settings_danger_description()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={SETTINGS_ROW_CLASS_NAME}>
              <div className="space-y-1">
                <Label className="text-base">
                  {m.settings_delete_account()}
                </Label>
                <p className="text-muted-foreground text-sm">
                  {m.settings_delete_account_description()}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    activeSubscription &&
                    !matchIsCancellationPending(activeSubscription)
                  ) {
                    toast.error(m.settings_cancel_subscription_first())

                    return
                  }

                  setIsDeleteAccountOpened(true)
                }}
              >
                <Trash />
                {m.settings_delete_account()}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
