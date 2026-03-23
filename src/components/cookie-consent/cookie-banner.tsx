import React from 'react'
import { Cookie } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { m } from '@/paraglide/messages.js'
import { Link } from '@tanstack/react-router'
import { useCookieConsent } from './cookie-provider'

const APPEAR_DELAY_S = 3.5
const BANNER_VIDEO_SRC = '/videos/want-a-cookie.mp4'
const BANNER_POSTER_SRC = '/images/want-a-cookie.webp'

const VideoCurve = () => {
  return (
    <svg
      viewBox="0 0 400 50"
      preserveAspectRatio="none"
      className="absolute inset-x-0 -bottom-px block h-12 w-full"
      aria-hidden="true"
    >
      <path d="M0,50 L0,18 Q200,-16 400,18 L400,50 Z" className="fill-card" />
    </svg>
  )
}

type BannerMediaProps = {
  isMobile: boolean
}

const BannerMedia = ({ isMobile }: BannerMediaProps) => {
  return (
    <div className="relative shrink-0">
      {isMobile ? (
        <img
          src={BANNER_POSTER_SRC}
          alt=""
          className="aspect-4/3 max-h-[40dvh] w-full object-cover object-top"
        />
      ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={BANNER_POSTER_SRC}
          className="aspect-4/3 max-h-[40dvh] w-full object-cover object-top sm:rounded-t-(--banner-radius) motion-reduce:hidden"
          src={BANNER_VIDEO_SRC}
        />
      )}
      <VideoCurve />
    </div>
  )
}

export const CookieBanner = () => {
  const { isBannerVisible, acceptAll, openSettings, config } =
    useCookieConsent()
  const isMobile = useIsMobile()

  const slideInitial = isMobile
    ? { y: '100%', opacity: 0 }
    : { x: '-100%', opacity: 0 }

  const slideAnimate = isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }

  const slideExit = isMobile
    ? { y: '100%', opacity: 0 }
    : { x: '-110%', opacity: 0 }

  return (
    <AnimatePresence>
      {isBannerVisible ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { delay: APPEAR_DELAY_S, duration: 0.3 }
            }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={slideInitial}
            animate={{
              ...slideAnimate,
              transition: {
                type: 'spring',
                damping: 28,
                stiffness: 220,
                delay: APPEAR_DELAY_S
              }
            }}
            exit={{
              ...slideExit,
              transition: { type: 'spring', damping: 32, stiffness: 300 }
            }}
            className="fixed bottom-0 left-0 z-50 w-full sm:bottom-5 sm:left-5 sm:w-[24rem]"
            role="dialog"
            aria-modal="true"
            aria-label={m.cookie_title()}
          >
            <div
              className="flex max-h-dvh flex-col overflow-hidden bg-card shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-(--banner-radius) sm:ring-1 sm:ring-border/30"
              style={{ '--banner-radius': '1.5rem' } as React.CSSProperties}
            >
              <BannerMedia isMobile={isMobile} />
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-7 pb-5 pt-1">
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">
                    {m.cookie_greeting()}
                  </p>
                  <h3 className="text-2xl font-extrabold tracking-tight">
                    {m.cookie_title()}{' '}
                    <Cookie
                      className="mb-0.5 inline size-6"
                      aria-hidden="true"
                    />
                  </h3>
                </div>
                <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {m.cookie_description()}{' '}
                  <Link
                    to={config.privacyPolicyUrl}
                    className="text-foreground/70 underline decoration-foreground/20 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/40"
                  >
                    {m.cookie_learn_more()}
                  </Link>
                </p>
              </div>
              <div className="flex items-center p-[--banner-gap] [--banner-gap:0.625rem]">
                <Button
                  variant="outline"
                  onClick={openSettings}
                  className="flex-1 rounded-none sm:rounded-bl-[calc(var(--banner-radius,1.5rem)-var(--banner-gap,0.625rem))] border-x-0 border-b-0 text-muted-foreground shadow-none hover:text-foreground"
                >
                  {m.cookie_customize()}
                </Button>
                <Button
                  onClick={acceptAll}
                  className="flex-1 rounded-none sm:rounded-br-[calc(var(--banner-radius,1.5rem)-var(--banner-gap,0.625rem))] font-bold"
                >
                  {m.cookie_accept()}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
