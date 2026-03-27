import React from 'react'
import { Check, Shield } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
import { Switch } from '~/components/ui/switch'
import { m } from '~/paraglide/messages.js'
import { useCookieConsent } from './cookie-provider'
import type { ConsentCategory } from './types'
import { getAllAcceptedCategories, getDefaultCategories } from './utils'

export const CookieSettings = () => {
  const {
    isSettingsOpen,
    closeSettings,
    state,
    updateConsent,
    config,
    acceptAll,
    rejectAll
  } = useCookieConsent()

  const [localCategories, setLocalCategories] = React.useState(state.categories)

  React.useEffect(() => {
    if (isSettingsOpen) {
      setLocalCategories(state.categories)
    }
  }, [isSettingsOpen, state.categories])

  const handleToggle = (key: ConsentCategory, checked: boolean) => {
    setLocalCategories((prev) => {
      return { ...prev, [key]: checked }
    })
  }

  const handleSave = () => {
    updateConsent(localCategories)
    closeSettings()
  }

  const handleAcceptAll = () => {
    setLocalCategories(getAllAcceptedCategories())
    acceptAll()
    closeSettings()
  }

  const handleRejectAll = () => {
    setLocalCategories(getDefaultCategories())
    rejectAll()
    closeSettings()
  }

  return (
    <Dialog
      open={isSettingsOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeSettings()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="sm:flex sm:items-center sm:gap-3">
            <div className="hidden size-10 items-center justify-center rounded-full bg-muted sm:flex">
              <Shield
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="text-center sm:text-left">
              <DialogTitle>{m.cookie_settings_title()}</DialogTitle>
              <DialogDescription>
                {m.cookie_settings_description()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Separator />
        <div className="space-y-4 py-4">
          {config.categories.map((category) => {
            const isEnabled = localCategories[category.key]
            const isRequired = category.required

            return (
              <div
                key={category.key}
                className="flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`cookie-${category.key}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {category.label}
                    </Label>
                    {isRequired ? (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {m.cookie_required()}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>
                </div>
                <Switch
                  id={`cookie-${category.key}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) => {
                    handleToggle(category.key, checked)
                  }}
                  disabled={isRequired}
                />
              </div>
            )
          })}
        </div>
        <Separator />
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRejectAll}
            className="w-full bg-transparent sm:w-auto"
          >
            {m.cookie_decline()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAcceptAll}
            className="w-full bg-transparent sm:w-auto"
          >
            {m.cookie_accept_all()}
          </Button>
          <Button size="sm" onClick={handleSave} className="w-full sm:w-auto">
            <Check className="size-4" aria-hidden="true" />
            {m.cookie_save_preferences()}
          </Button>
        </DialogFooter>
        <p className="text-xs text-center text-muted-foreground">
          {m.cookie_read_our()}{' '}
          <Link
            to="/privacy"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            {m.cookie_privacy_policy()}
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}
