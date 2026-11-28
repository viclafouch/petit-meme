import { Link } from '@tanstack/react-router'
import { MessagingAppIcon } from '~/components/icon/messaging-app-icon'
import { AppQrCode } from '~/components/install/app-qr-code'
import { PhoneInstallAction } from '~/components/install/install-action'
import { ShareDemo } from '~/components/install/share-demo'
import { ShareDestinations } from '~/components/install/share-destinations'
import { MESSAGING_APPS } from '~/constants/messaging-apps'
import { m } from '~/paraglide/messages'
import { HomeShowcaseSection } from './home-showcase-section'

const getShareSteps = () => {
  return [
    {
      title: m.home_mobile_step_open_title(),
      text: m.home_mobile_step_open_text()
    },
    {
      title: m.home_mobile_step_share_title(),
      text: m.home_mobile_step_share_text()
    },
    {
      title: m.home_mobile_step_send_title(),
      text: m.home_mobile_step_send_text()
    }
  ]
}

export const HomeMobile = () => {
  return (
    <HomeShowcaseSection
      headingId="home-mobile"
      title={m.home_mobile_title()}
      lead={m.home_mobile_lead()}
      glowClassName="-scale-x-100 bg-(image:--gradient-glow-app)"
      isVisualFirst
      visual={
        <div className="relative mx-auto w-64 sm:w-72 lg:w-80 lg:perspective-[112.5rem]">
          <ShareDestinations className="inset-y-[8%] left-full ms-2 w-[clamp(8rem,11vw,13rem)]" />
          <ShareDemo className="lg:rotate-x-6 lg:rotate-y-20 lg:-rotate-3" />
        </div>
      }
    >
      <ol className="flex flex-col gap-4">
        {getShareSteps().map((step, index) => {
          return (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-(image:--gradient-brand) font-bricolage font-bold text-(--color-brand-foreground)"
              >
                {index + 1}
              </span>
              <span className="flex flex-col gap-1">
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="max-w-[42ch] text-muted-foreground text-pretty">
                  {step.text}
                </p>
              </span>
            </li>
          )
        })}
      </ol>
      <span aria-hidden="true" className="flex -space-x-1.5 xl:hidden">
        {MESSAGING_APPS.map((app) => {
          return (
            <MessagingAppIcon
              key={app.id}
              app={app}
              className="w-10 shadow-md ring-2 ring-background"
            />
          )
        })}
      </span>
      <div className="w-full max-w-sm pointer-fine:hidden">
        <PhoneInstallAction />
      </div>
      <AppQrCode className="pointer-coarse:hidden" />
      <Link
        to="/app"
        className="rounded-sm text-sm font-semibold underline decoration-foreground/30 underline-offset-4 focus-visible:focus-ring mouse:hover:decoration-foreground"
      >
        {m.home_mobile_app_link()}
      </Link>
    </HomeShowcaseSection>
  )
}
