import { Maximize, Send, Smartphone } from 'lucide-react'
import { AppIcon } from '~/components/install/app-icon'
import { InstallAppButton } from '~/components/install/install-app-button'
import { getInstallGuide } from '~/components/install/install-guide'
import { InstallGuideSteps } from '~/components/install/install-guide-steps'
import { useInstallMethod } from '~/components/install/use-install-app'
import { buildScreenshotPath } from '~/helpers/web-app-assets'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'

const SCREENSHOT_NAMES = ['home', 'reels', 'meme'] as const

const getFeatures = () => {
  return [
    {
      Icon: Maximize,
      title: m.app_page_feature_fullscreen_title(),
      description: m.app_page_feature_fullscreen_description()
    },
    {
      Icon: Smartphone,
      title: m.app_page_feature_launch_title(),
      description: m.app_page_feature_launch_description()
    },
    {
      Icon: Send,
      title: m.app_page_feature_share_title(),
      description: m.app_page_feature_share_description()
    }
  ]
}

const InstallAction = () => {
  const method = useInstallMethod()

  if (method === null) {
    return null
  }

  if (method === 'installed') {
    return (
      <p className="text-center text-muted-foreground">
        {m.app_page_installed()}
      </p>
    )
  }

  if (method === 'native') {
    return <InstallAppButton surface="app-page" className="w-full max-w-xs" />
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-5">
      <p className="text-sm font-medium">
        {getInstallGuide(method).description}
      </p>
      <InstallGuideSteps method={method} />
    </div>
  )
}

export const AppPage = () => {
  const locale = getLocale()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-14">
      <section className="flex flex-col items-center gap-6">
        <AppIcon size={96} className="size-24 shadow-2xl" />
        <div className="flex flex-col items-center gap-3">
          <PageHeading>{m.app_page_title()}</PageHeading>
          <PageDescription>{m.app_page_description()}</PageDescription>
        </div>
        <InstallAction />
      </section>
      <ul className="grid w-full gap-6 sm:grid-cols-3">
        {getFeatures().map(({ Icon, title, description }) => {
          return (
            <li key={title} className="flex flex-col gap-2">
              <Icon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            </li>
          )
        })}
      </ul>
      <div className="-mx-4 flex w-screen max-w-4xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:w-full sm:justify-center sm:overflow-visible sm:px-0">
        {SCREENSHOT_NAMES.map((name) => {
          return (
            <img
              key={name}
              src={buildScreenshotPath({ locale, formFactor: 'narrow', name })}
              alt=""
              aria-hidden="true"
              width={195}
              height={332}
              loading="lazy"
              decoding="async"
              className="w-48 shrink-0 snap-center rounded-3xl border-4 border-muted bg-black shadow-xl"
            />
          )
        })}
      </div>
    </div>
  )
}
