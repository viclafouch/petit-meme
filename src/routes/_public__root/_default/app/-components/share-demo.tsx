import React from 'react'
import {
  ChevronLeft,
  Copy,
  Download,
  Ellipsis,
  Link2,
  Mic,
  Pause,
  Phone,
  Play,
  Plus,
  Share2,
  Sparkles,
  Star,
  Video,
  VolumeX,
  X
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { LOGO_PATH } from '~/constants/branding'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { DEMO_ASSET_PATHS } from '~/routes/_public__root/_default/app/-lib/demo'
import { MESSAGING_APPS } from '~/routes/_public__root/_default/app/-lib/messaging-apps'
import { DemoTabBar } from './demo-tab-bar'
import { MessagingAppIcon } from './messaging-app-icon'
import { PhoneFrame } from './phone-frame'

const SHARE_SHEET_APP_COUNT = 4
type TapMarkProps = {
  isSecondTap?: boolean
}

const TapMark = ({ isSecondTap = false }: TapMarkProps) => {
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-1/2 left-1/2 z-10 -mt-[5cqw] -ml-[5cqw] size-[10cqw] rounded-full bg-white/45 opacity-0 ring-[0.6cqw] ring-white/70',
        isSecondTap
          ? 'motion-safe:animate-demo-tap-second'
          : 'motion-safe:animate-demo-tap'
      )}
    />
  )
}

const DemoMemeImage = () => {
  return (
    <img
      src={DEMO_ASSET_PATHS.sharedMeme}
      alt=""
      width={640}
      height={349}
      decoding="async"
      className="size-full object-cover"
    />
  )
}

const MemeScreen = () => {
  return (
    <div className="absolute inset-0 flex flex-col pt-[12.5cqw]">
      <div className="flex h-[10cqw] items-center px-[4cqw]">
        <img
          src={LOGO_PATH}
          alt=""
          width={28}
          height={28}
          decoding="async"
          className="size-[7.5cqw]"
        />
      </div>
      <span className="flex items-center gap-[0.6cqw] px-[3cqw] pb-[2.5cqw] text-[3.2cqw] text-white/70">
        <ChevronLeft className="size-[4cqw]" />
        {m.meme_back()}
      </span>
      <div className="relative mx-[3cqw] aspect-video overflow-hidden rounded-[3cqw] bg-black">
        <DemoMemeImage />
        <span className="absolute top-[2cqw] right-[2cqw] flex size-[6.5cqw] items-center justify-center rounded-full bg-black/55">
          <VolumeX className="size-[3.6cqw]" />
        </span>
        <span className="absolute inset-x-0 bottom-0 h-[0.9cqw] bg-white/25">
          <span className="block h-full origin-left bg-white [transform:scaleX(0.6)] motion-safe:animate-demo-progress" />
        </span>
      </div>
      <div className="flex items-start justify-between gap-[2cqw] px-[4cqw] pt-[3.5cqw]">
        <p className="text-[4.2cqw] leading-tight font-semibold text-balance">
          {m.app_page_demo_meme_title()}
        </p>
        <Star className="mt-[0.4cqw] size-[4.6cqw] shrink-0 text-white/70" />
      </div>
      <div className="flex flex-col gap-[2cqw] px-[3cqw] pt-[3.5cqw] text-[3.3cqw] font-medium">
        <span className="flex h-[9.5cqw] items-center justify-center gap-[1.5cqw] rounded-[2.4cqw] bg-white text-black">
          <Sparkles className="size-[3.8cqw]" />
          {m.meme_open_studio()}
        </span>
        <div className="grid grid-cols-2 gap-[2cqw]">
          <span className="relative flex h-[9.5cqw] items-center justify-center gap-[1.5cqw] rounded-[2.4cqw] border border-white/15 bg-white/5 motion-safe:animate-demo-press">
            <Share2 className="size-[3.8cqw]" />
            {m.meme_share()}
            <TapMark />
          </span>
          <span className="flex h-[9.5cqw] items-center justify-center gap-[1.5cqw] rounded-[2.4cqw] border border-white/15 bg-white/5">
            <Download className="size-[3.8cqw]" />
            {m.meme_download()}
          </span>
        </div>
        <span className="flex h-[9.5cqw] items-center justify-center gap-[1.5cqw] rounded-[2.4cqw] border border-white/15 bg-white/5">
          <Link2 className="size-[3.8cqw]" />
          {m.meme_copy_link()}
        </span>
      </div>
      <p className="px-[4cqw] pt-[5cqw] pb-[2.5cqw] text-[3.4cqw] font-semibold">
        {m.meme_related()}
      </p>
      <div className="grid grid-cols-2 gap-[2cqw] px-[3cqw]">
        <span className="aspect-video overflow-hidden rounded-[2.4cqw]">
          <img
            src={DEMO_ASSET_PATHS.reelMeme}
            alt=""
            width={400}
            height={712}
            decoding="async"
            className="size-full object-cover object-[50%_30%]"
          />
        </span>
        <span className="aspect-video overflow-hidden rounded-[2.4cqw]">
          <img
            src={DEMO_ASSET_PATHS.relatedMeme}
            alt=""
            width={320}
            height={182}
            decoding="async"
            className="size-full object-cover"
          />
        </span>
      </div>
      <DemoTabBar activeTab="memes" className="bg-neutral-950" />
    </div>
  )
}

const ShareSheet = () => {
  const actions = [
    { Icon: Copy, label: m.app_page_demo_copy() },
    { Icon: Download, label: m.app_page_demo_save() }
  ]

  return (
    <div className="rounded-t-[7cqw] bg-neutral-800 pb-[8cqw] shadow-[0_-2cqw_6cqw_rgb(0_0_0/0.4)]">
      <div className="flex items-center gap-[3cqw] px-[5cqw] pt-[5cqw] pb-[4cqw]">
        <span className="aspect-video w-[16cqw] shrink-0 overflow-hidden rounded-[1.6cqw]">
          <DemoMemeImage />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[0.6cqw]">
          <span className="truncate text-[3.3cqw] font-semibold">
            {m.app_page_demo_meme_title()}
          </span>
          <span className="text-[2.8cqw] text-white/55">
            {m.app_page_demo_file_type()}
          </span>
        </span>
        <span className="flex size-[7cqw] shrink-0 items-center justify-center rounded-full bg-white/10">
          <X className="size-[3.6cqw] text-white/70" />
        </span>
      </div>
      <div className="grid grid-cols-5 gap-[1cqw] border-t border-white/10 px-[3cqw] pt-[4.5cqw] pb-[4cqw]">
        {MESSAGING_APPS.slice(0, SHARE_SHEET_APP_COUNT).map((app, index) => {
          const isTapped = index === 0

          return (
            <span
              key={app.id}
              className="flex flex-col items-center gap-[1.4cqw] text-[2.5cqw] text-white/85"
            >
              <span
                className={cn(
                  'relative',
                  isTapped && 'motion-safe:animate-demo-press-second'
                )}
              >
                <MessagingAppIcon app={app} className="w-[13.5cqw]" />
                {isTapped ? <TapMark isSecondTap /> : null}
              </span>
              {app.name}
            </span>
          )
        })}
        <span className="flex flex-col items-center gap-[1.4cqw] text-[2.5cqw] text-white/85">
          <span className="flex aspect-square w-[13.5cqw] items-center justify-center rounded-[23%] bg-white/12">
            <Ellipsis className="size-[6cqw]" />
          </span>
          {m.app_page_demo_more()}
        </span>
      </div>
      <div className="mx-[4cqw] overflow-hidden rounded-[3cqw] bg-white/8 text-[3.3cqw]">
        {actions.map(({ Icon, label }) => {
          return (
            <span
              key={label}
              className="flex h-[10cqw] items-center justify-between px-[4cqw] not-last:border-b not-last:border-white/10"
            >
              {label}
              <Icon className="size-[4.2cqw] text-white/70" />
            </span>
          )
        })}
      </div>
    </div>
  )
}

const ChatScreen = () => {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#0e1016] pt-[12.5cqw]">
      <div className="flex h-[12cqw] items-center gap-[2cqw] border-b border-white/10 px-[2.5cqw]">
        <ChevronLeft className="size-[5.5cqw] text-white/80" />
        <span className="flex size-[8.5cqw] shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-300 to-rose-500 text-[4.4cqw]">
          🍕
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[3.5cqw] font-semibold">
            {m.app_page_demo_chat_name()}
          </span>
          <span className="truncate text-[2.5cqw] text-white/50">
            {m.app_page_demo_chat_members()}
          </span>
        </span>
        <Video className="size-[5cqw] text-white/80" />
        <Phone className="mr-[1.5cqw] ml-[3cqw] size-[4.4cqw] text-white/80" />
      </div>
      <div className="flex flex-col gap-[2.2cqw] px-[3.5cqw] pt-[5cqw] text-[3.3cqw] leading-snug">
        <p className="max-w-[72%] self-start rounded-[3.8cqw] rounded-bl-[1.2cqw] bg-neutral-800 px-[3cqw] py-[2cqw]">
          {m.app_page_demo_chat_ask()}
        </p>
        <div className="w-[64%] self-end rounded-[3.8cqw] rounded-br-[1.2cqw] bg-[#fbc850] p-[1cqw] text-black motion-safe:animate-demo-message">
          <div className="relative aspect-video overflow-hidden rounded-[3cqw]">
            <DemoMemeImage />
            <span className="absolute top-1/2 left-1/2 flex size-[9cqw] -translate-1/2 items-center justify-center rounded-full bg-black/50 text-white">
              <Play className="ml-[0.5cqw] size-[4.2cqw] fill-current" />
            </span>
            <span className="absolute bottom-[1.4cqw] left-[1.6cqw] rounded-full bg-black/55 px-[1.4cqw] text-[2.4cqw] text-white tabular-nums">
              0:11
            </span>
            <img
              src={DEMO_ASSET_PATHS.watermark}
              alt=""
              width={160}
              height={39}
              decoding="async"
              className="absolute right-[3%] bottom-[5%] w-[12%] opacity-60"
            />
          </div>
          <span className="block px-[1.5cqw] pt-[0.8cqw] text-right text-[2.3cqw] text-black/60 tabular-nums">
            9:41 ✓✓
          </span>
        </div>
        <p className="self-start text-[8cqw] leading-none motion-safe:animate-demo-message-second">
          😂😂😂
        </p>
        <p className="max-w-[72%] self-start rounded-[3.8cqw] rounded-bl-[1.2cqw] bg-neutral-800 px-[3cqw] py-[2cqw] motion-safe:animate-demo-message-third">
          {m.app_page_demo_chat_reply()}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-[2.5cqw] px-[3.5cqw] pt-[2cqw] pb-[7cqw]">
        <Plus className="size-[5.5cqw] text-white/70" />
        <span className="flex h-[8.5cqw] flex-1 items-center rounded-full border border-white/15 px-[3.5cqw] text-[3.2cqw] text-white/40">
          {m.app_page_demo_chat_composer()}
        </span>
        <Mic className="size-[5cqw] text-white/70" />
      </div>
    </div>
  )
}

type ShareDemoProps = {
  className?: string
}

export const ShareDemo = ({ className }: ShareDemoProps) => {
  const [isPaused, setIsPaused] = React.useState(false)

  return (
    <figure className={cn('flex flex-col items-center gap-4', className)}>
      <figcaption className="sr-only">{m.app_page_demo_label()}</figcaption>
      <div
        aria-hidden="true"
        data-paused={isPaused ? '' : undefined}
        className="w-full data-paused:**:[animation-play-state:paused]"
      >
        <PhoneFrame platform="iphone">
          <MemeScreen />
          <div className="absolute inset-0 z-10 bg-black/50 motion-safe:animate-demo-dim" />
          <div className="absolute inset-x-0 bottom-0 z-20 motion-safe:animate-demo-sheet">
            <ShareSheet />
          </div>
          <div className="absolute inset-0 z-20 [transform:translateX(100%)] motion-safe:animate-demo-chat">
            <ChatScreen />
          </div>
        </PhoneFrame>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full text-muted-foreground motion-reduce:hidden"
        aria-label={isPaused ? m.app_page_demo_play() : m.app_page_demo_pause()}
        onClick={() => {
          setIsPaused((wasPaused) => {
            return !wasPaused
          })
        }}
      >
        {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </Button>
    </figure>
  )
}
