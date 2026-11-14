import type React from 'react'
import {
  Camera,
  Compass,
  MessageCircle,
  Mic,
  Phone,
  Search
} from 'lucide-react'
import { AppIcon } from '~/components/install/app-icon'
import { SITE_NAME } from '~/constants/branding'
import { APP_SCREEN_SIZE, buildAppScreenPath } from '~/helpers/web-app-assets'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { DEMO_CLOCK } from '~/routes/_public__root/_default/app/-lib/demo'
import { MESSAGING_APPS } from '~/routes/_public__root/_default/app/-lib/messaging-apps'
import { MessagingAppIcon } from './messaging-app-icon'
import { PhoneFrame } from './phone-frame'

const HOME_SCREENS = {
  android: {
    wallpaperClassName:
      'bg-[#1b1530] bg-[radial-gradient(90%_60%_at_15%_10%,#5b3fa8_0%,transparent_70%),radial-gradient(100%_70%_at_100%_95%,#b2456e_0%,transparent_70%)]',
    iconClassName: 'rounded-full',
    gridClassName: 'mt-auto',
    dockClassName: 'rounded-full bg-white/12',
    dockIconClassName: 'rounded-full',
    contentClassName: 'top-[9cqw]',
    launchOrigin: '62.5% 70%'
  },
  iphone: {
    wallpaperClassName:
      'bg-[#0d1b2a] bg-[radial-gradient(110%_70%_at_85%_5%,#2f7a9a_0%,transparent_65%),radial-gradient(90%_70%_at_0%_100%,#e0a23a_0%,transparent_60%)]',
    iconClassName: 'rounded-[23%]',
    gridClassName: 'mt-[4cqw]',
    dockClassName: 'rounded-[8cqw] bg-white/18 backdrop-blur-sm',
    dockIconClassName: 'rounded-[23%]',
    contentClassName: 'top-[12.5cqw]',
    launchOrigin: '62.5% 27%'
  }
} as const

type Platform = keyof typeof HOME_SCREENS

const DOCK_APPS = [
  { id: 'phone', Icon: Phone, className: 'bg-emerald-500 text-white' },
  { id: 'messages', Icon: MessageCircle, className: 'bg-sky-500 text-white' },
  { id: 'browser', Icon: Compass, className: 'bg-white text-sky-600' },
  { id: 'camera', Icon: Camera, className: 'bg-zinc-300 text-zinc-800' }
]

type HomeScreenProps = {
  platform: Platform
}

const HomeScreen = ({ platform }: HomeScreenProps) => {
  const design = HOME_SCREENS[platform]
  const isAndroid = platform === 'android'

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col px-[6cqw] pt-[15cqw] pb-[8cqw]',
        design.wallpaperClassName
      )}
    >
      {isAndroid ? (
        <span className="text-[16cqw] leading-none font-light tracking-tight tabular-nums">
          {DEMO_CLOCK.android}
        </span>
      ) : null}
      <div
        className={cn(
          'grid grid-cols-4 gap-x-[5cqw] gap-y-[4.5cqw]',
          design.gridClassName
        )}
      >
        {MESSAGING_APPS.map((app) => {
          return (
            <span
              key={app.id}
              className="flex flex-col items-center gap-[1.4cqw] text-[2.6cqw] text-white/90"
            >
              <MessagingAppIcon
                app={app}
                className={cn('w-full', design.iconClassName)}
              />
              {app.name}
            </span>
          )
        })}
        <span className="relative flex flex-col items-center gap-[1.4cqw] text-[2.6cqw] font-semibold whitespace-nowrap">
          <AppIcon
            size={96}
            className={cn('aspect-square w-full', design.iconClassName)}
          />
          {SITE_NAME}
          <span className="launch-demo-tap absolute top-[1cqw] left-1/2 -ml-[5cqw] size-[10cqw] rounded-full bg-white/45 ring-[0.6cqw] ring-white/70" />
        </span>
      </div>
      <span
        className={cn(
          'mt-auto mb-[4cqw] flex items-center gap-[2cqw] self-center text-white/75',
          isAndroid
            ? 'h-[10cqw] w-full rounded-full bg-white/15 px-[4cqw]'
            : 'h-[7cqw] rounded-full bg-white/15 px-[3.5cqw] text-[2.8cqw]'
        )}
      >
        <Search className="size-[3.8cqw]" />
        {isAndroid ? (
          <>
            <span className="flex-1" />
            <Mic className="size-[3.8cqw]" />
          </>
        ) : (
          m.app_page_demo_search()
        )}
      </span>
      <div
        className={cn(
          'grid grid-cols-4 gap-[4cqw] p-[3cqw]',
          design.dockClassName
        )}
      >
        {DOCK_APPS.map(({ id, Icon, className }) => {
          return (
            <span
              key={id}
              className={cn(
                'flex aspect-square items-center justify-center',
                design.dockIconClassName,
                className
              )}
            >
              <Icon className="size-[45%]" strokeWidth={2} />
            </span>
          )
        })}
      </div>
    </div>
  )
}

type LaunchDemoProps = {
  platform: Platform
  delay: string
  className?: string
  style?: React.CSSProperties
}

export const LaunchDemo = ({
  platform,
  delay,
  className,
  style
}: LaunchDemoProps) => {
  const locale = getLocale()

  return (
    <PhoneFrame
      platform={platform}
      className={cn('launch-demo', className)}
      style={{
        ...style,
        '--launch-delay': delay,
        '--launch-origin': HOME_SCREENS[platform].launchOrigin
      }}
    >
      <HomeScreen platform={platform} />
      <div className="launch-demo-app absolute inset-0 z-20 overflow-hidden bg-black">
        <AppIcon
          size={192}
          className="absolute top-1/2 left-1/2 w-[34%] -translate-1/2 rounded-none ring-0"
        />
        <img
          src={buildAppScreenPath(locale, 'home')}
          alt=""
          width={APP_SCREEN_SIZE.width}
          height={APP_SCREEN_SIZE.height}
          loading="lazy"
          decoding="async"
          className={cn(
            'launch-demo-content absolute inset-x-0 w-full',
            HOME_SCREENS[platform].contentClassName
          )}
        />
      </div>
    </PhoneFrame>
  )
}
