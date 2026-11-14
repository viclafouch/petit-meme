import {
  BadgeCheck,
  House,
  Maximize,
  MonitorDown,
  ScanLine,
  Send
} from 'lucide-react'
import { AppIcon } from '~/components/install/app-icon'
import {
  getInstallGuide,
  type InstallGuideStep
} from '~/components/install/install-guide'
import { InstallGuideSteps } from '~/components/install/install-guide-steps'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { MESSAGING_APPS } from '~/routes/_public__root/_default/app/-lib/messaging-apps'
import { AppQrCode } from './app-qr-code'
import { PhoneInstallAction } from './install-action'
import { LaunchDemo } from './launch-demo'
import { MessagingAppIcon } from './messaging-app-icon'
import { ShareDemo } from './share-demo'

const SECTION_HEADING_CLASS_NAME =
  'font-bricolage text-3xl leading-heading font-semibold text-balance sm:text-4xl'

const HERO_GLOW_CLASS_NAME =
  'bg-[radial-gradient(28%_42%_at_72%_45%,rgb(251_200_80/0.30),transparent),radial-gradient(26%_36%_at_30%_56%,rgb(122_178_200/0.24),transparent),radial-gradient(20%_22%_at_62%_76%,rgb(214_41_118/0.16),transparent)]'

const Hero = () => {
  return (
    <section className="relative isolate">
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-x-4 -inset-y-10 -z-10',
          HERO_GLOW_CLASS_NAME
        )}
      />
      <div className="grid items-center justify-center gap-x-16 gap-y-12 lg:min-h-[calc(100svh-var(--navbar-height)-6rem)] lg:grid-cols-[minmax(0,34rem)_20rem]">
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
          <p className="max-w-[44ch] text-muted-foreground text-pretty pointer-coarse:order-last sm:text-lg">
            {m.app_page_lead()}
          </p>
          <div className="flex items-center gap-3 pointer-coarse:order-last">
            <span aria-hidden="true" className="flex -space-x-1.5">
              {MESSAGING_APPS.map((app) => {
                return (
                  <MessagingAppIcon
                    key={app.id}
                    app={app}
                    className="w-9 shadow-md ring-2 ring-background"
                  />
                )
              })}
            </span>
            <p className="max-w-[24ch] text-sm leading-snug font-medium text-pretty">
              {m.app_page_share_targets()}
            </p>
          </div>
          <div className="w-full pointer-fine:hidden">
            <PhoneInstallAction />
          </div>
          <AppQrCode className="mt-2 pointer-coarse:hidden" />
        </div>
        <ShareDemo className="mx-auto w-64 sm:w-72 lg:w-full" />
      </div>
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

type FeatureListProps = {
  features: {
    Icon: typeof House
    title: string
    description: string
  }[]
  isEndAligned?: boolean
  className?: string
}

const FeatureList = ({
  features,
  isEndAligned = false,
  className
}: FeatureListProps) => {
  return (
    <ul className={cn('flex flex-col gap-10', className)}>
      {features.map(({ Icon, title, description }) => {
        return (
          <li
            key={title}
            className={cn(
              'flex flex-col gap-2',
              isEndAligned && 'lg:items-end lg:text-right'
            )}
          >
            <Icon aria-hidden="true" className="size-5 text-amber-500" />
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="max-w-[30ch] text-muted-foreground text-pretty">
              {description}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

const Platforms = () => {
  const leadingFeatures = [
    {
      Icon: House,
      title: m.app_page_feature_launch_title(),
      description: m.app_page_feature_launch_description()
    },
    {
      Icon: Send,
      title: m.app_page_feature_share_title(),
      description: m.app_page_feature_share_description()
    }
  ]

  const trailingFeatures = [
    {
      Icon: Maximize,
      title: m.app_page_feature_fullscreen_title(),
      description: m.app_page_feature_fullscreen_description()
    },
    {
      Icon: BadgeCheck,
      title: m.app_page_feature_free_title(),
      description: m.app_page_install_note()
    }
  ]

  return (
    <section className="flex flex-col items-center gap-14">
      <div className="flex max-w-xl flex-col items-center gap-3 text-center">
        <h2 className={SECTION_HEADING_CLASS_NAME}>
          {m.app_page_platforms_heading()}
        </h2>
        <p className="text-lg text-muted-foreground text-pretty">
          {m.app_page_platforms_description()}
        </p>
      </div>
      <div className="grid w-full items-center gap-14 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
        <FeatureList
          features={leadingFeatures}
          isEndAligned
          className="order-2 lg:order-1"
        />
        <div className="order-1 flex flex-col items-center gap-6 lg:order-2">
          <div className="flex items-start justify-center">
            <LaunchDemo
              platform="android"
              delay="0s"
              className="platform-phone-reveal relative mt-10 -mr-6 w-44 sm:w-56"
              style={{ '--phone-tilt': '-6deg' }}
            />
            <LaunchDemo
              platform="iphone"
              delay="5s"
              className="platform-phone-reveal relative z-10 -ml-6 w-44 sm:w-56"
              style={{ '--phone-tilt': '5deg' }}
            />
          </div>
          <p className="flex gap-8 text-sm font-medium text-muted-foreground">
            <span>Android</span>
            <span>iPhone</span>
          </p>
        </div>
        <FeatureList features={trailingFeatures} className="order-3" />
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
      <h2 className={SECTION_HEADING_CLASS_NAME}>
        {m.app_page_install_heading()}
      </h2>
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
