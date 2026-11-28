import { Link } from '@tanstack/react-router'
import { MessagingAppIcon } from '~/components/icon/messaging-app-icon'
import { MESSAGING_APPS } from '~/constants/messaging-apps'
import { m } from '~/paraglide/messages'
import { AppQrCode } from '~/routes/_public__root/app/-components/app-qr-code'
import { PhoneInstallAction } from '~/routes/_public__root/app/-components/install-action'
import { ShareDemo } from '~/routes/_public__root/app/-components/share-demo'

const FLOATING_APP_COUNT = 5

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
    <section
      aria-labelledby="home-mobile"
      className="home-fullscreen relative isolate grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20"
    >
      <span
        aria-hidden="true"
        className="home-mobile-glow pointer-events-none absolute -inset-x-4 inset-y-0 -z-10"
      />
      <div className="relative mx-auto w-64 sm:w-72 lg:order-first lg:w-80">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[8%] left-full ms-2 w-[clamp(8rem,11vw,13rem)] max-xl:hidden"
        >
          {MESSAGING_APPS.slice(0, FLOATING_APP_COUNT).map((app) => {
            return (
              <MessagingAppIcon
                key={app.id}
                app={app}
                className="hero-destination"
              />
            )
          })}
        </div>
        <ShareDemo className="home-phone-tilt" />
      </div>
      <div className="flex flex-col items-start gap-6">
        <h2 id="home-mobile" className="home-split-heading">
          {m.home_mobile_title()}
        </h2>
        <p className="max-w-[48ch] text-lg text-muted-foreground text-pretty">
          {m.home_mobile_lead()}
        </p>
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
      </div>
    </section>
  )
}
