import {
  Camera,
  Download,
  Globe,
  MessageCircle,
  Mic,
  Phone,
  Search,
  Share2,
  Star,
  VolumeX
} from 'lucide-react'
import { AppIcon } from '~/components/install/app-icon'
import { LOGO_PATH, SITE_NAME } from '~/constants/branding'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import {
  DEMO_ASSET_PATHS,
  DEMO_CLOCK
} from '~/routes/_public__root/_default/app/-lib/demo'
import { MESSAGING_APPS } from '~/routes/_public__root/_default/app/-lib/messaging-apps'
import { DemoTabBar } from './demo-tab-bar'
import { MessagingAppIcon } from './messaging-app-icon'

const DOCK_APPS = [
  { id: 'phone', Icon: Phone, className: 'bg-emerald-500' },
  { id: 'messages', Icon: MessageCircle, className: 'bg-sky-500' },
  { id: 'browser', Icon: Globe, className: 'bg-white text-sky-600' },
  { id: 'camera', Icon: Camera, className: 'bg-zinc-300 text-zinc-800' }
]

export const AndroidHomeScreen = () => {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#1b1530] bg-[radial-gradient(90%_60%_at_15%_10%,#5b3fa8_0%,transparent_70%),radial-gradient(100%_70%_at_100%_95%,#b2456e_0%,transparent_70%)] px-[6cqw] pt-[16cqw]">
      <span className="text-[16cqw] leading-none font-light tracking-tight tabular-nums">
        {DEMO_CLOCK.android}
      </span>
      <div className="mt-auto grid grid-cols-4 gap-x-[4cqw] gap-y-[5cqw] pb-[6cqw]">
        {MESSAGING_APPS.map((app) => {
          return (
            <span
              key={app.id}
              className="flex flex-col items-center gap-[1.4cqw] text-[2.6cqw] text-white/90"
            >
              <MessagingAppIcon app={app} className="w-full rounded-full" />
              {app.name}
            </span>
          )
        })}
        <span className="flex flex-col items-center gap-[1.4cqw] text-[2.6cqw] font-semibold whitespace-nowrap">
          <AppIcon
            size={96}
            className="aspect-square w-full rounded-full shadow-[0_0_0_0.8cqw_rgb(251_200_80/0.9),0_0_6cqw_rgb(251_200_80/0.55)]"
          />
          {SITE_NAME}
        </span>
      </div>
      <span className="mb-[4cqw] flex h-[10cqw] items-center gap-[2.5cqw] rounded-full bg-white/15 px-[4cqw] text-white/70">
        <Search className="size-[4.4cqw]" />
        <span className="flex-1" />
        <Mic className="size-[4.4cqw]" />
      </span>
      <div className="mb-[9cqw] grid grid-cols-4 gap-[4cqw] rounded-[7cqw] bg-white/10 p-[3cqw]">
        {DOCK_APPS.map(({ id, Icon, className }) => {
          return (
            <span
              key={id}
              className={cn(
                'flex aspect-square items-center justify-center rounded-full text-white',
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

export const IphoneReelScreen = () => {
  const actions = [
    { id: 'bookmark', Icon: Star },
    { id: 'share', Icon: Share2 },
    { id: 'download', Icon: Download }
  ]

  return (
    <div className="absolute inset-0 bg-black">
      <img
        src={DEMO_ASSET_PATHS.reelMeme}
        alt=""
        width={400}
        height={712}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 to-transparent" />
      <div className="absolute inset-x-0 top-[13cqw] flex items-center justify-between px-[4cqw]">
        <img
          src={LOGO_PATH}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="size-[7.5cqw]"
        />
        <span className="flex items-center gap-[1.2cqw] rounded-full bg-white px-[2.6cqw] py-[1cqw] text-[2.8cqw] font-medium text-black">
          {m.meme_unmute()}
          <VolumeX className="size-[3.4cqw]" />
        </span>
      </div>
      <div className="absolute right-[3.5cqw] bottom-[34cqw] flex flex-col gap-[5cqw] drop-shadow-md">
        {actions.map(({ id, Icon }) => {
          return <Icon key={id} className="size-[6.5cqw]" strokeWidth={1.8} />
        })}
      </div>
      <p className="absolute right-[16cqw] bottom-[22cqw] left-[4cqw] text-[3.8cqw] leading-tight font-semibold">
        {m.app_page_demo_reel_title()}
      </p>
      <DemoTabBar activeTab="reels" className="bg-black/90" />
    </div>
  )
}
