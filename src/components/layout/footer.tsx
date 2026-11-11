import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { CookieTrigger } from '~/components/cookie-consent/cookie-trigger'
import { getLegalLinks } from '~/constants/navigation'
import { useCookieConsentStore } from '~/stores/cookie-consent.store'

export const Footer = () => {
  const hasConsented = useSelector(useCookieConsentStore(), (state) => {
    return state.consent.hasConsented
  })

  return (
    <footer className="border-t bg-background/40 relative">
      <div className="container py-6">
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-6">
          {getLegalLinks().map((link) => {
            return (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            )
          })}
          {hasConsented ? <CookieTrigger /> : null}
        </div>
      </div>
    </footer>
  )
}
