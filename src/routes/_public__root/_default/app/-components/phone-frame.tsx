import type React from 'react'
import { cn } from '~/lib/utils'
import { DEMO_CLOCK } from '~/routes/_public__root/_default/app/-lib/demo'

const SignalIcon = () => {
  return (
    <svg viewBox="0 0 18 12" className="h-[2.6cqw]" fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
  )
}

const WifiIcon = () => {
  return (
    <svg viewBox="0 0 16 12" className="h-[2.6cqw]" fill="currentColor">
      <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 0 0 8 .4C5.2.4 2.5 1.5.5 3.4l1.2 1.3A9 9 0 0 1 8 2.2Z" />
      <path d="M8 5.8c1.4 0 2.7.5 3.7 1.4l1.2-1.3A7.3 7.3 0 0 0 8 4c-1.8 0-3.5.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Z" />
      <path d="M8 9.2c.5 0 1 .2 1.3.5L8 11.6 6.7 9.7c.3-.3.8-.5 1.3-.5Z" />
    </svg>
  )
}

const BatteryIcon = () => {
  return (
    <svg viewBox="0 0 27 13" className="h-[2.8cqw]">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="12"
        rx="3.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
      />
      <rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" />
      <path
        d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  )
}

const IphoneHardware = () => {
  return (
    <>
      <span className="absolute top-[18%] -left-[0.9cqw] h-[4%] w-[1.1cqw] rounded-l-sm bg-zinc-600" />
      <span className="absolute top-[25%] -left-[0.9cqw] h-[7%] w-[1.1cqw] rounded-l-sm bg-zinc-600" />
      <span className="absolute top-[34%] -left-[0.9cqw] h-[7%] w-[1.1cqw] rounded-l-sm bg-zinc-600" />
      <span className="absolute top-[28%] -right-[0.9cqw] h-[11%] w-[1.1cqw] rounded-r-sm bg-zinc-600" />
    </>
  )
}

const AndroidHardware = () => {
  return (
    <>
      <span className="absolute top-[20%] -right-[0.8cqw] h-[12%] w-[1cqw] rounded-r-sm bg-zinc-700" />
      <span className="absolute top-[36%] -right-[0.8cqw] h-[6%] w-[1cqw] rounded-r-sm bg-zinc-700" />
    </>
  )
}

const PLATFORM_DESIGNS = {
  iphone: {
    Hardware: IphoneHardware,
    frameClassName:
      'aspect-[71.6/147.6] rounded-[15.5cqw] bg-linear-to-b from-zinc-500 via-zinc-700 to-zinc-500 p-[0.7cqw]',
    bezelClassName: 'rounded-[14.8cqw] p-[3.1cqw]',
    screenClassName: 'rounded-[11.8cqw]',
    statusBarClassName: 'h-[12.5cqw] px-[9cqw] text-[3.9cqw]',
    cameraClassName: 'h-[8.6cqw] w-[30cqw]',
    homeIndicatorClassName: 'h-[1.3cqw] w-[36cqw]'
  },
  android: {
    Hardware: AndroidHardware,
    frameClassName: 'aspect-[72/154] rounded-[11cqw] bg-zinc-800 p-[0.6cqw]',
    bezelClassName: 'rounded-[10.4cqw] p-[2.4cqw]',
    screenClassName: 'rounded-[8cqw]',
    statusBarClassName: 'h-[9cqw] px-[6cqw] text-[3.3cqw]',
    cameraClassName: 'size-[3.6cqw] ring-[0.5cqw] ring-zinc-900',
    homeIndicatorClassName: 'h-[1cqw] w-[28cqw]'
  }
} as const

type PhoneFrameProps = {
  platform: keyof typeof PLATFORM_DESIGNS
  children: React.ReactNode
  className?: string
  screenClassName?: string
  style?: React.CSSProperties
}

export const PhoneFrame = ({
  platform,
  className,
  screenClassName,
  style,
  children
}: PhoneFrameProps) => {
  const design = PLATFORM_DESIGNS[platform]

  return (
    <div
      aria-hidden="true"
      className={cn('@container', className)}
      style={style}
    >
      <div
        className={cn(
          'relative shadow-[0_2.5cqw_8cqw_-2cqw_rgb(0_0_0/0.55),0_0_0_0.35cqw_rgb(255_255_255/0.08)]',
          design.frameClassName
        )}
      >
        <design.Hardware />
        <div className={cn('size-full bg-black', design.bezelClassName)}>
          <div
            className={cn(
              'relative isolate size-full overflow-hidden bg-neutral-950 text-white [contain:paint] select-none',
              design.screenClassName,
              screenClassName
            )}
          >
            <div
              className={cn(
                'absolute inset-x-0 top-0 z-30 flex items-center justify-between font-semibold text-white tabular-nums',
                design.statusBarClassName
              )}
            >
              <span>{DEMO_CLOCK[platform]}</span>
              <span className="flex items-center gap-[1.2cqw]">
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </span>
            </div>
            <span
              className={cn(
                'absolute top-[2.6cqw] left-1/2 z-40 -translate-x-1/2 rounded-full bg-black',
                design.cameraClassName
              )}
            />
            {children}
            <span
              className={cn(
                'absolute bottom-[1.8cqw] left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/80',
                design.homeIndicatorClassName
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
