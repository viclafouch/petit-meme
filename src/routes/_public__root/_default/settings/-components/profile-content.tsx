import React from 'react'
import type { User } from 'better-auth'
import { CreditCard, Download, Key, Stars, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'
import { Separator } from '@/components/ui/separator'
import { DeleteAccountDialog } from '@/components/User/delete-account-dialog'
import { UpdatePasswordDialog } from '@/components/User/update-password-dialog'
import {
  type BetterAuthPlanName,
  getFreePlan,
  getPremiumPlan
} from '@/constants/plan'
import { getSubscriptionDisplayInfo } from '@/helpers/subscription'
import { useStripeCheckout } from '@/hooks/use-stripe-checkout'
import { captureWithFeature } from '@/lib/sentry'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime'
import type { ActiveSubscription } from '@/server/customer'
import { exportUserData } from '@/server/user'
import { downloadBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

const SETTINGS_ROW_CLASS_NAME =
  'flex md:items-center justify-between gap-6 flex-col md:flex-row'

type ProfileContentParams = {
  user: User
  activeSubscription: ActiveSubscription | null
}

export const ProfileContent = ({
  user,
  activeSubscription
}: ProfileContentParams) => {
  const [isUpdatePasswordOpened, setIsUpdatePasswordOpened] =
    React.useState(false)
  const [isDeleteAccountOpened, setIsDeleteAccountOpened] =
    React.useState(false)

  const { goToBillingPortal } = useStripeCheckout()

  const exportMutation = useMutation({
    mutationFn: async () => {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })
      const filename =
        getLocale() === 'fr'
          ? 'mes-donnees-petit-meme.json'
          : 'my-data-petit-meme.json'
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
            <div className={SETTINGS_ROW_CLASS_NAME}>
              <div className="space-y-1">
                <Label className="text-base">
                  {m.settings_current_subscription()}
                </Label>
                {activeSubscription ? (
                  <p className="text-muted-foreground text-sm">
                    {getPremiumPlan().title} -{' '}
                    {
                      getSubscriptionDisplayInfo({
                        planName: activeSubscription.plan as BetterAuthPlanName,
                        locale: getLocale()
                      }).displayPrice
                    }{' '}
                    -{' '}
                    <span className="text-info">
                      {activeSubscription.cancelAtPeriodEnd
                        ? m.settings_subscription_ends({
                            date: new Date(
                              activeSubscription.periodEnd!
                            ).toLocaleDateString(getLocale())
                          })
                        : m.settings_subscription_renews({
                            date: new Date(
                              activeSubscription.periodEnd!
                            ).toLocaleDateString(getLocale())
                          })}
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {getFreePlan().title} - {m.pricing_free_label()}
                  </p>
                )}
              </div>
              {activeSubscription ? (
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
              ) : (
                <Button
                  asChild
                  className="border-amber-400/30 bg-amber-400/15 text-amber-400 hover:bg-amber-400/25"
                >
                  <Link to="/pricing">
                    <Stars />
                    {m.nav_upgrade_premium()}
                  </Link>
                </Button>
              )}
            </div>
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
                    !activeSubscription.cancelAtPeriodEnd
                  ) {
                    toast.error(m.settings_cancel_subscription_first())

                    return
                  }

                  setIsDeleteAccountOpened(true)
                }}
              >
                <Trash2 />
                {m.settings_delete_account()}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
