/* eslint-disable id-length */
import React from 'react'
import { Cookie } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { CookieConsentValue } from '@/lib/cookie-consent'
import { setCookieConsent } from '@/lib/cookie-consent'

const APPEAR_DELAY_S = 2

type CookieConsentBannerProps = {
  initialConsent: CookieConsentValue | null
  onAccept?: () => void
  onDecline?: () => void
}

export const CookieConsentBanner = ({
  initialConsent,
  onAccept,
  onDecline
}: CookieConsentBannerProps) => {
  const [isVisible, setIsVisible] = React.useState(!initialConsent)

  const handleDismiss = (value: CookieConsentValue, callback?: () => void) => {
    setCookieConsent(value)
    setIsVisible(false)
    callback?.()
  }

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            transition: {
              type: 'spring',
              stiffness: 180,
              damping: 22,
              delay: APPEAR_DELAY_S
            }
          }}
          exit={{
            y: 60,
            opacity: 0,
            scale: 0.96,
            filter: 'blur(6px)',
            transition: {
              type: 'spring',
              stiffness: 260,
              damping: 28
            }
          }}
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:bottom-4 sm:left-4 sm:right-auto sm:w-90 sm:p-0"
        >
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl backdrop-blur-2xl">
            <div className="p-4 pb-3">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-muted/80">
                  <Cookie className="size-3.5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold tracking-tight">Cookies</p>
              </div>
              <p className="text-xs text-balance leading-relaxed text-muted-foreground">
                Nous utilisons des cookies analytiques pour améliorer votre
                expérience et analyser le trafic.{' '}
                <a
                  href="/privacy"
                  className="text-foreground/60 underline decoration-foreground/20 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/40"
                >
                  En savoir plus
                </a>
              </p>
            </div>
            <div className="flex border-t border-border/40">
              <button
                onClick={() => {
                  handleDismiss('declined', onDecline)
                }}
                type="button"
                className="flex-1 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                Refuser
              </button>
              <div className="w-px bg-border/40" />
              <button
                onClick={() => {
                  handleDismiss('accepted', onAccept)
                }}
                type="button"
                className="flex-1 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
              >
                Accepter
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
