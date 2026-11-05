import { Button } from '~/components/ui/button'
import { m } from '~/paraglide/messages.js'
import { useCookieConsentStore } from './cookie-consent.store'

export const CookieTrigger = () => {
  const { openSettings } = useCookieConsentStore().actions

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
