import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { FREE_PLAN, type Plan, PREMIUM_PLAN } from '@/constants/plan'
import { formatCentsToEuros } from '@/helpers/number'
import { useStripeCheckout } from '@/hooks/use-stripe-checkout'
import { getActiveSubscriptionQueryOpts } from '@/lib/queries'
import { buildPricingJsonLd, seo } from '@/lib/seo'
import { cn } from '@/lib/utils'
import {
  PageDescription,
  PageHeading
} from '@/routes/_public__root/-components/page-headers'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'

const StatusColorByFeatureStatus = {
  included: 'text-green-400',
  limited: 'text-yellow-400',
  // eslint-disable-next-line camelcase
  not_included: 'text-red-400'
} satisfies Record<Plan['features'][number]['status'], string>

const CheckItem = ({ feature }: { feature: Plan['features'][number] }) => {
  return (
    <div className="flex gap-2">
      <CheckCircle2
        size={18}
        className={cn('my-auto', StatusColorByFeatureStatus[feature.status])}
      />
      <p className="pt-0.5 text-foreground text-sm">
        {feature.label}{' '}
        {feature.note ? (
          <span className="text-muted-foreground text-xs">{`(${feature.note})`}</span>
        ) : null}
      </p>
    </div>
  )
}

const PricingCard = ({
  title,
  monthlyPriceInCents,
  description,
  features,
  productId,
  isExclusive = false,
  isActive,
  onChangePlan
}: Plan & {
  isActive: boolean
  onChangePlan: (productId: string) => void
}) => {
  return (
    <Card
      className={cn(`flex flex-col justify-between py-1 border-border flex-1`, {
        'animate-background-shine bg-background dark:bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-size-[200%_100%] transition-colors':
          isExclusive && !isActive
      })}
    >
      <div>
        <CardHeader className="pb-8 pt-4">
          <CardTitle className="text-foreground text-lg flex items-center justify-between">
            {title}
            {isExclusive ? (
              <svg
                className="animate-ping-slow size-5 text-amber-400 dark:hidden"
                viewBox="0 0 50 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M30.5 25C30.5 28.0376 28.0376 30.5 25 30.5C21.9624 30.5 19.5 28.0376 19.5 25C19.5 21.9624 21.9624 19.5 25 19.5C28.0376 19.5 30.5 21.9624 30.5 25Z"
                  stroke="currentColor"
                  strokeOpacity="0.7"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M38.75 25C38.75 32.5939 32.5939 38.75 25 38.75C17.4061 38.75 11.25 32.5939 11.25 25C11.25 17.4061 17.4061 11.25 25 11.25C32.5939 11.25 38.75 17.4061 38.75 25Z"
                  stroke="currentColor"
                  strokeOpacity="0.4"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M47.5 25C47.5 37.4264 37.4264 47.5 25 47.5C12.5736 47.5 2.5 37.4264 2.5 25C2.5 12.5736 12.5736 2.5 25 2.5C37.4264 2.5 47.5 12.5736 47.5 25Z"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </CardTitle>
          <div className="flex gap-0.5">
            <h3 className="text-3xl font-bold">
              {formatCentsToEuros(monthlyPriceInCents)}
            </h3>
            <span className="flex flex-col justify-end text-sm mb-1">
              /mois
            </span>
          </div>
          <CardDescription className="pt-1.5">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {features.map((feature) => {
            return <CheckItem key={feature.label} feature={feature} />
          })}
        </CardContent>
      </div>
      <CardFooter className="mt-2">
        {isActive ? (
          <Button
            onClick={(event) => {
              event.preventDefault()
              onChangePlan(productId)
            }}
            className="w-full text-green-500"
            size="xl"
            disabled={isActive}
            variant="outline"
          >
            Actif
          </Button>
        ) : (
          <Button
            onClick={(event) => {
              event.preventDefault()
              onChangePlan(productId)
            }}
            size="xl"
            className="w-full"
            variant={isExclusive ? 'default' : 'secondary'}
          >
            Mettre à niveau
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

const RouteComponent = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const { goToBillingPortal, checkoutPremium } = useStripeCheckout()

  const activeSubscriptionQuery = useSuspenseQuery(
    getActiveSubscriptionQueryOpts()
  )

  return (
    <div>
      <PageHeading>Plans</PageHeading>
      <PageDescription>
        Choisissez l’offre qui correspond à vos besoins, du gratuit à
        l’illimité.
      </PageDescription>
      <div className="w-full mx-auto py-12">
        <section className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-center gap-8 sm:max-w-2xl mx-auto max-w-md">
          <PricingCard
            {...FREE_PLAN}
            onChangePlan={() => {
              void goToBillingPortal()
            }}
            isActive={Boolean(
              user !== null && activeSubscriptionQuery.data === null
            )}
          />
          <PricingCard
            {...PREMIUM_PLAN}
            onChangePlan={() => {
              void checkoutPremium()
            }}
            isActive={Boolean(
              user !== null && activeSubscriptionQuery.data !== null
            )}
          />
        </section>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/pricing')({
  component: RouteComponent,
  scripts: () => {
    return [
      {
        type: 'application/ld+json',
        children: JSON.stringify(buildPricingJsonLd([FREE_PLAN, PREMIUM_PLAN]))
      }
    ]
  },
  head: () => {
    return seo({
      title: 'Plans et Tarifs',
      pathname: '/pricing',
      description:
        'Découvre les plans de Petit Meme : gratuit ou Premium avec accès illimité aux mèmes, favoris et générations de vidéos. Choisis le plan qui te permet de créer et partager des mèmes sans limites !'
    })
  }
})
