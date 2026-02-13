import React from 'react'
import type { User } from 'better-auth'
import { formatDate } from 'date-fns'
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
import { FREE_PLAN, PREMIUM_PLAN } from '@/constants/plan'
import { formatCentsToEuros } from '@/helpers/number'
import { useStripeCheckout } from '@/hooks/use-stripe-checkout'
import type { ActiveSubscription } from '@/server/customer'
import { exportUserData } from '@/server/user'
import { downloadBlob } from '@/utils/download'
import { useMutation } from '@tanstack/react-query'

export const ProfileContent = ({
  user,
  activeSubscription
}: {
  user: User
  activeSubscription: ActiveSubscription | null
}) => {
  const [isUpdatePasswordOpened, setIsUpdatePasswordOpened] =
    React.useState(false)
  const [isDeleteAccountOpened, setIsDeleteAccountOpened] =
    React.useState(false)

  const { goToBillingPortal, checkoutPremium } = useStripeCheckout()

  const exportMutation = useMutation({
    mutationFn: async () => {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })
      downloadBlob(blob, 'mes-donnees-petit-meme.json')
    },
    onSuccess: () => {
      toast.success('Données téléchargées')
    },
    onError: () => {
      toast.error('Erreur lors du téléchargement')
    }
  })

  return (
    <div>
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
            <CardTitle>Compte et abonnement</CardTitle>
            <CardDescription>
              Gérez les préférences de votre compte et votre abonnement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex md:items-center justify-between gap-6 flex-col md:flex-row">
              <div className="space-y-1">
                <Label className="text-base">Abonnement en cours</Label>
                {activeSubscription ? (
                  <p className="text-muted-foreground text-sm">
                    {PREMIUM_PLAN.title} - {formatCentsToEuros(399)}/mois -{' '}
                    <span className="text-info">
                      {activeSubscription.cancelAtPeriodEnd
                        ? `Fin le ${formatDate(activeSubscription.periodEnd!, 'dd/MM/yyyy')}`
                        : `Renouvellement le ${formatDate(activeSubscription.periodEnd!, 'dd/MM/yyyy')}`}
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {FREE_PLAN.title} - Gratuit
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
                  Gérer mon abonnement
                </Button>
              ) : (
                <Button
                  variant="info"
                  onClick={(event) => {
                    event.preventDefault()
                    void checkoutPremium()
                  }}
                >
                  <Stars />
                  Passer à Premium
                </Button>
              )}
            </div>
            <Separator />
            <div className="flex md:items-center justify-between gap-6 flex-col md:flex-row">
              <div className="space-y-1">
                <Label className="text-base">Mot de passe</Label>
                <p className="text-muted-foreground text-sm">
                  Modifier votre mot de passe
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setIsUpdatePasswordOpened(true)
                }}
              >
                <Key />
                Modifier mon mot de passe
              </Button>
            </div>
            <Separator />
            <div className="flex md:items-center justify-between gap-6 flex-col md:flex-row">
              <div className="space-y-1">
                <Label className="text-base">Mes données personnelles</Label>
                <p className="text-muted-foreground text-sm">
                  Télécharger une copie de vos données au format JSON (RGPD)
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
                Télécharger mes données
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
            <CardDescription>
              Actions irréversibles et destructrices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex md:items-center justify-between gap-6 flex-col md:flex-row">
              <div className="space-y-1">
                <Label className="text-base">Supprimer mon compte</Label>
                <p className="text-muted-foreground text-sm">
                  Supprimer définitivement votre compte et toutes vos données
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    activeSubscription &&
                    !activeSubscription.cancelAtPeriodEnd
                  ) {
                    toast.error("Vous devez d'abord annuler votre abonnement")

                    return
                  }

                  setIsDeleteAccountOpened(true)
                }}
              >
                <Trash2 />
                Supprimer mon compte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
