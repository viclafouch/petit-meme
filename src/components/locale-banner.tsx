import React from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AnimatedBanner } from '@/components/custom/animated-banner'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '@/components/icon/flags'
import { Button } from '@/components/ui/button'
import { getLocaleDisplayName, getSuggestedLocale } from '@/helpers/locale'
import { dismissLocaleBanner } from '@/lib/locale-banner'
import { m } from '@/paraglide/messages.js'
import { getLocale, locales, setLocale } from '@/paraglide/runtime'
import { updateUserLocale } from '@/server/user-locale'
import { ClientOnly } from '@tanstack/react-router'

type LocaleBannerProps = {
  isInitiallyDismissed: boolean
}

const LocaleBannerContent = ({ isInitiallyDismissed }: LocaleBannerProps) => {
  const isReducedMotion = useReducedMotion()
  const currentLocale = getLocale()

  const suggestedLocale = getSuggestedLocale({
    browserLanguages: navigator.languages,
    currentLocale,
    availableLocales: locales
  })

  const [isDismissed, setIsDismissed] = React.useState(isInitiallyDismissed)

  const handleDismiss = () => {
    dismissLocaleBanner()
    setIsDismissed(true)
  }

  const handleSwitch = () => {
    if (!suggestedLocale) {
      return
    }

    void updateUserLocale({ data: { locale: suggestedLocale } })
    dismissLocaleBanner()
    void setLocale(suggestedLocale)
  }

  const displayName = suggestedLocale
    ? getLocaleDisplayName(suggestedLocale, currentLocale)
    : null
  const SuggestedFlag = suggestedLocale ? LOCALE_FLAGS[suggestedLocale] : null

  return (
    <AnimatePresence>
      {!isDismissed && suggestedLocale && displayName ? (
        <motion.div
          initial={isReducedMotion ? false : { height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: isReducedMotion
              ? { duration: 0 }
              : {
                  height: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2, delay: 0.05 }
                }
          }}
          exit={
            isReducedMotion
              ? { opacity: 0, transition: { duration: 0 } }
              : {
                  height: 0,
                  opacity: 0,
                  transition: {
                    opacity: { duration: 0.15 },
                    height: {
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      delay: 0.05
                    }
                  }
                }
          }
          className="overflow-hidden"
        >
          <AnimatedBanner>
            <div className="flex w-full items-center justify-center gap-2 px-10 text-foreground sm:gap-3">
              {SuggestedFlag ? (
                <SuggestedFlag className={FLAG_ICON_CLASS} />
              ) : null}
              <span className="text-xs sm:text-sm">
                {m.locale_banner_available({ language: displayName })}
              </span>
              <button
                type="button"
                onClick={handleSwitch}
                className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background transition-opacity hover:opacity-80"
              >
                {m.locale_banner_switch({ language: displayName })}
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              aria-label={m.common_close()}
              className="absolute right-2 min-h-11 min-w-11 shrink-0 text-foreground/60 hover:bg-transparent hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          </AnimatedBanner>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export const LocaleBanner = ({ isInitiallyDismissed }: LocaleBannerProps) => {
  return (
    <ClientOnly>
      <LocaleBannerContent isInitiallyDismissed={isInitiallyDismissed} />
    </ClientOnly>
  )
}
