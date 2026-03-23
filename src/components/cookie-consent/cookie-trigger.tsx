import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages.js'
import { useCookieConsent } from './cookie-provider'

export const CookieTrigger = () => {
  const { openSettings } = useCookieConsent()

  return (
    <Button
      variant="link"
      onClick={openSettings}
      className="text-xs text-muted-foreground h-auto p-0 underline decoration-muted-foreground/40 underline-offset-4 hover:text-foreground hover:no-underline"
    >
      {m.cookie_manage()}
    </Button>
  )
}
