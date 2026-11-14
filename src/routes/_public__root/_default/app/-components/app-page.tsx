import { MonitorDown, ScanLine, Send } from 'lucide-react'
import { AppIcon } from '~/components/install/app-icon'
import {
  getInstallGuide,
  type InstallGuideStep
} from '~/components/install/install-guide'
import { InstallGuideSteps } from '~/components/install/install-guide-steps'
import { m } from '~/paraglide/messages'
import { MESSAGING_APPS } from '~/routes/_public__root/_default/app/-lib/messaging-apps'
import { AppQrCode } from './app-qr-code'
import { PhoneInstallAction } from './install-action'
import { MessagingAppIcon } from './messaging-app-icon'
import { PhoneFrame } from './phone-frame'
import { AndroidHomeScreen, IphoneReelScreen } from './platform-screens'
import { ShareDemo } from './share-demo'

const SECTION_HEADING_CLASS_NAME =
  'font-bricolage text-3xl leading-heading font-semibold text-balance sm:text-4xl'

const Hero = () => {
  return (
    <section className="grid items-center gap-x-16 gap-y-12 lg:min-h-[calc(100svh-var(--navbar-height)-6rem)] lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex flex-col items-start gap-6 sm:gap-7">
        <div className="flex items-center gap-3">
          <AppIcon size={112} className="size-14 shadow-lg" />
          <div className="flex flex-col">
            <h1 className="text-base font-semibold">{m.app_page_title()}</h1>
            <p className="text-sm text-muted-foreground">
              {m.app_page_listing()}
            </p>
          </div>
        </div>
        <p className="max-w-[13ch] font-bricolage text-[2.75rem] leading-[0.95] font-bold tracking-tight text-balance sm:text-6xl xl:text-7xl">
          {m.app_page_heading()}
        </p>
        <p className="max-w-[46ch] text-muted-foreground text-pretty pointer-coarse:order-last sm:text-lg">
          {m.app_page_lead()}
        </p>
        <div className="w-full pointer-fine:hidden">
          <PhoneInstallAction />
        </div>
        <AppQrCode className="mt-3 pointer-coarse:hidden" />
      </div>
      <ShareDemo className="mx-auto w-64 sm:w-72 xl:w-80" />
    </section>
  )
}

const Destinations = () => {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 className={SECTION_HEADING_CLASS_NAME}>
          {m.app_page_destinations_heading()}
        </h2>
        <p className="max-w-[46ch] text-lg text-muted-foreground text-pretty">
          {m.app_page_destinations_description()}
        </p>
      </div>
      <div className="flex flex-col gap-5">
        <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
          {MESSAGING_APPS.map((app) => {
            return (
              <li
                key={app.id}
                className="flex flex-col items-center gap-2 text-sm font-medium"
              >
                <MessagingAppIcon app={app} className="w-14 shadow-md" />
                {app.name}
              </li>
            )
          })}
        </ul>
        <p className="text-sm text-muted-foreground max-sm:text-center">
          {m.app_page_destinations_more()}
        </p>
      </div>
    </section>
  )
}

const Platforms = () => {
  const showcases = [
    {
      name: 'Android',
      platform: 'android',
      frameClassName: 'w-60',
      Screen: AndroidHomeScreen,
      title: m.app_page_feature_launch_title(),
      description: m.app_page_feature_launch_description(),
      extra: {
        title: m.app_page_feature_share_title(),
        description: m.app_page_feature_share_description()
      }
    },
    {
      name: 'iPhone',
      platform: 'iphone',
      frameClassName: 'w-[15.5rem]',
      Screen: IphoneReelScreen,
      title: m.app_page_feature_fullscreen_title(),
      description: m.app_page_feature_fullscreen_description(),
      extra: null
    }
  ] as const

  return (
    <section className="flex flex-col gap-12">
      <h2 className={SECTION_HEADING_CLASS_NAME}>
        {m.app_page_platforms_heading()}
      </h2>
      <div className="grid gap-16 md:grid-cols-2 md:gap-10">
        {showcases.map(
          ({
            name,
            platform,
            frameClassName,
            Screen,
            title,
            description,
            extra
          }) => {
            return (
              <article
                key={platform}
                className="flex flex-col items-center gap-8 md:items-start"
              >
                <PhoneFrame platform={platform} className={frameClassName}>
                  <Screen />
                </PhoneFrame>
                <div className="flex max-w-sm flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {name}
                  </p>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-pretty">
                    {description}
                  </p>
                  {extra ? (
                    <div className="mt-3 flex gap-2 text-sm text-muted-foreground">
                      <Send
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0"
                      />
                      <p className="text-pretty">
                        <strong className="block font-semibold text-foreground">
                          {extra.title}
                        </strong>
                        {extra.description}
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>
            )
          }
        )}
      </div>
    </section>
  )
}

const InstallSteps = () => {
  const scanStep: InstallGuideStep = {
    Icon: ScanLine,
    text: m.app_page_install_step_scan()
  }

  const columns = [
    {
      title: m.app_page_install_iphone(),
      steps: [scanStep, ...getInstallGuide('ios-guide').steps]
    },
    {
      title: m.app_page_install_android(),
      steps: [
        scanStep,
        {
          Icon: MonitorDown,
          text: m.app_page_install_step_android_install({
            label: m.install_cta()
          })
        },
        { Icon: null, text: m.app_page_install_step_android_confirm() }
      ]
    }
  ]

  return (
    <section className="flex flex-col gap-10 pointer-coarse:hidden">
      <div className="flex flex-col gap-3">
        <h2 className={SECTION_HEADING_CLASS_NAME}>
          {m.app_page_install_heading()}
        </h2>
        <p className="text-lg text-muted-foreground">
          {m.app_page_install_note()}
        </p>
      </div>
      <div className="grid gap-10 md:grid-cols-2">
        {columns.map(({ title, steps }) => {
          return (
            <div key={title} className="flex flex-col gap-5">
              <h3 className="text-xl font-semibold">{title}</h3>
              <InstallGuideSteps steps={steps} className="max-w-md gap-4" />
            </div>
          )
        })}
      </div>
    </section>
  )
}

export const AppPage = () => {
  return (
    <div className="flex flex-col gap-28 lg:gap-36">
      <Hero />
      <Destinations />
      <Platforms />
      <InstallSteps />
    </div>
  )
}
