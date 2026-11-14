import type React from 'react'
import { ChevronLeft, Mic, Phone, Play, Plus, Video } from 'lucide-react'
import { APP_SCREEN_SIZE, buildAppScreenPath } from '~/helpers/web-app-assets'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import APP_SCREENS from '~/routes/_public__root/_default/app/-lib/app-screens.json'
import { DEMO_ASSET_PATHS } from '~/routes/_public__root/_default/app/-lib/demo'
import { PhoneFrame } from './phone-frame'

const VIDEO_SHARE_MOMENT = 0.055
const SOUND_SHARE_MOMENT = 0.455
const SHARE_TAP_MOMENTS = [VIDEO_SHARE_MOMENT, SOUND_SHARE_MOMENT]

const AUDIO_WAVEFORM_PATH =
  'M1 5v2M3 4v4M5 2.5v7M7 4.5v3M9 1.5v9M11 3v6M13 4.5v3M15 2v8M17 1v10M19 3.5v5M21 4v4M23 2v8M25 3v6M27 4.5v3M29 3.5v5M31 2.5v7M33 4v4M35 5v2'

const SENT_BUBBLE_CLASS_NAME =
  'self-end rounded-[3.8cqw] rounded-br-[1.2cqw] bg-[#fbc850] text-black'

const RECEIVED_BUBBLE_CLASS_NAME =
  'max-w-[72%] self-start rounded-[3.8cqw] rounded-bl-[1.2cqw] bg-neutral-800 px-[3cqw] py-[2cqw]'

const SENT_TEXT_BUBBLE_CLASS_NAME = cn(
  SENT_BUBBLE_CLASS_NAME,
  'max-w-[72%] px-[3cqw] py-[2cqw]'
)

const CHAT_AVATAR_CLASS_NAME =
  'flex size-[8.5cqw] shrink-0 items-center justify-center rounded-full text-[4.4cqw] font-semibold'

const toPercent = (ratio: number) => {
  return `calc(${ratio} * 100%)`
}

const MemeScreen = () => {
  const locale = getLocale()
  const { share } = APP_SCREENS[locale]

  return (
    <div
      className="absolute inset-x-0 top-[12.5cqw]"
      style={{
        aspectRatio: `${APP_SCREEN_SIZE.width} / ${APP_SCREEN_SIZE.height}`
      }}
    >
      <img
        src={buildAppScreenPath(locale, 'meme')}
        alt=""
        width={APP_SCREEN_SIZE.width}
        height={APP_SCREEN_SIZE.height}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 size-full"
      />
      <span
        className="absolute flex items-center justify-center"
        style={{
          left: toPercent(share.left),
          top: toPercent(share.top),
          width: toPercent(share.width),
          height: toPercent(share.height)
        }}
      >
        {SHARE_TAP_MOMENTS.map((moment) => {
          return (
            <span
              key={moment}
              className="share-demo-tap absolute size-[10cqw] rounded-full bg-white/45 ring-[0.6cqw] ring-white/70"
              style={{ '--demo-moment': moment }}
            />
          )
        })}
      </span>
    </div>
  )
}

const VideoBubble = () => {
  return (
    <div
      className={cn(
        SENT_BUBBLE_CLASS_NAME,
        'share-demo-video-message w-[62%] p-[1cqw]'
      )}
    >
      <div className="relative aspect-video overflow-hidden rounded-[3cqw]">
        <img
          src={DEMO_ASSET_PATHS.sharedMeme}
          alt=""
          width={640}
          height={349}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        <span className="absolute top-1/2 left-1/2 flex size-[9cqw] -translate-1/2 items-center justify-center rounded-full bg-black/50 text-white">
          <Play className="ml-[0.5cqw] size-[4.2cqw] fill-current" />
        </span>
        <span className="absolute bottom-[1.4cqw] left-[1.6cqw] rounded-full bg-black/55 px-[1.4cqw] text-[2.4cqw] text-white tabular-nums">
          0:11
        </span>
      </div>
    </div>
  )
}

const SoundBubble = () => {
  return (
    <div
      className={cn(
        SENT_BUBBLE_CLASS_NAME,
        'share-demo-audio-message flex w-[62%] items-center gap-[2cqw] px-[2.5cqw] py-[2cqw]'
      )}
    >
      <span className="flex size-[7.5cqw] shrink-0 items-center justify-center rounded-full bg-black text-[#fbc850]">
        <Play className="ml-[0.4cqw] size-[3.6cqw] fill-current" />
      </span>
      <svg
        viewBox="0 0 36 12"
        preserveAspectRatio="none"
        className="h-[6cqw] flex-1 text-black/70"
      >
        <path
          d={AUDIO_WAVEFORM_PATH}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[2.4cqw] text-black/60 tabular-nums">0:11</span>
    </div>
  )
}

type ChatScreenProps = {
  avatar: React.ReactNode
  name: string
  status: string
  className: string
  children: React.ReactNode
}

const ChatScreen = ({
  avatar,
  name,
  status,
  className,
  children
}: ChatScreenProps) => {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex flex-col bg-[#0e1016] pt-[12.5cqw] text-white',
        className
      )}
    >
      <div className="flex h-[12cqw] items-center gap-[2cqw] border-b border-white/10 px-[2.5cqw]">
        <ChevronLeft className="size-[5.5cqw] text-white/80" />
        {avatar}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[3.5cqw] font-semibold">{name}</span>
          <span className="truncate text-[2.5cqw] text-white/50">{status}</span>
        </span>
        <Video className="size-[5cqw] text-white/80" />
        <Phone className="mr-[1.5cqw] ml-[3cqw] size-[4.4cqw] text-white/80" />
      </div>
      <div className="flex flex-col gap-[2.2cqw] px-[3.5cqw] pt-[5cqw] text-[3.3cqw] leading-snug">
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-[2.5cqw] px-[3.5cqw] pt-[2cqw] pb-[7cqw]">
        <Plus className="size-[5.5cqw] text-white/70" />
        <span className="flex h-[8.5cqw] flex-1 items-center rounded-full border border-white/15 px-[3.5cqw] text-[3.2cqw] text-white/40">
          {m.app_page_demo_composer()}
        </span>
        <Mic className="size-[5cqw] text-white/70" />
      </div>
    </div>
  )
}

const GroupChat = () => {
  return (
    <ChatScreen
      className="share-demo-group-chat"
      avatar={
        <span
          className={cn(
            CHAT_AVATAR_CLASS_NAME,
            'bg-linear-to-br from-amber-300 to-rose-500'
          )}
        >
          🍕
        </span>
      }
      name={m.app_page_demo_group_name()}
      status={m.app_page_demo_group_members()}
    >
      <p className={RECEIVED_BUBBLE_CLASS_NAME}>
        {m.app_page_demo_group_ask()}
      </p>
      <VideoBubble />
      <p className="share-demo-laugh-message self-start text-[8cqw] leading-none">
        😂😂😂
      </p>
    </ChatScreen>
  )
}

const FriendChat = () => {
  const friendName = m.app_page_demo_friend_name()

  return (
    <ChatScreen
      className="share-demo-friend-chat"
      avatar={
        <span
          className={cn(
            CHAT_AVATAR_CLASS_NAME,
            'bg-linear-to-br from-sky-400 to-indigo-600'
          )}
        >
          {friendName.charAt(0)}
        </span>
      }
      name={friendName}
      status={m.app_page_demo_friend_status()}
    >
      <p className={RECEIVED_BUBBLE_CLASS_NAME}>
        {m.app_page_demo_friend_match()}
      </p>
      <p className={SENT_TEXT_BUBBLE_CLASS_NAME}>
        {m.app_page_demo_friend_answer()}
      </p>
      <p className={RECEIVED_BUBBLE_CLASS_NAME}>
        {m.app_page_demo_friend_ask()}
      </p>
      <SoundBubble />
      <p className={cn(RECEIVED_BUBBLE_CLASS_NAME, 'share-demo-reply-message')}>
        {m.app_page_demo_friend_reply()}
      </p>
    </ChatScreen>
  )
}

type ShareDemoProps = {
  className?: string
}

export const ShareDemo = ({ className }: ShareDemoProps) => {
  return (
    <figure className={cn('share-demo', className)}>
      <figcaption className="sr-only">{m.app_page_demo_label()}</figcaption>
      <PhoneFrame platform="iphone" screenClassName="bg-[#0a0a0a]">
        <MemeScreen />
        <GroupChat />
        <FriendChat />
      </PhoneFrame>
    </figure>
  )
}
