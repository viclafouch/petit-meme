import React from 'react'
import { toast } from 'sonner'
import type { WithDialog } from '~/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/animate-ui/radix/dialog'
import { DiscordIcon, XTwitterIcon } from '~/components/icon'
import { Button } from '~/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { LastLoginBadge } from '~/components/User/last-login-badge'
import { LoginForm } from '~/components/User/login-form'
import { SignupForm } from '~/components/User/signup-form'
import { getAuthErrorMessage } from '~/helpers/auth-errors'
import { useLastLoginMethod } from '~/hooks/use-last-login-method'
import { authClient } from '~/lib/auth-client'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { localizeHref } from '~/paraglide/runtime'

type AuthType = 'login' | 'signup'

const matchIsAuthType = (value: string): value is AuthType => {
  return value === 'login' || value === 'signup'
}

type SocialProvider = {
  id: string
  icon: React.ComponentType<React.ComponentProps<'svg'>>
  label: () => string
  errorMessage: () => string
}

const ANIMATED_TAB_CONTENT_CLASS =
  '[grid-area:1/1] transition-[height,opacity] duration-300 ease-in-out data-[state=inactive]:h-0 data-[state=inactive]:overflow-hidden data-[state=inactive]:opacity-0'

const SOCIAL_PROVIDERS = [
  {
    id: 'twitter',
    icon: XTwitterIcon,
    label: () => {
      return m.auth_continue_with_x()
    },
    errorMessage: () => {
      return m.auth_twitter_error()
    }
  },
  {
    id: 'discord',
    icon: DiscordIcon,
    label: () => {
      return m.auth_continue_with_discord()
    },
    errorMessage: () => {
      return m.auth_discord_error()
    }
  }
] as const satisfies readonly SocialProvider[]

export const AuthDialog = ({ open, onOpenChange }: WithDialog<unknown>) => {
  const [authType, setAuthType] = React.useState<AuthType>('login')
  const lastLoginMethod = useLastLoginMethod()

  const handleSignInWithSocial = async (
    provider: (typeof SOCIAL_PROVIDERS)[number]
  ) => {
    try {
      await authClient.signIn.social({
        provider: provider.id,
        callbackURL: localizeHref('/')
      })
    } catch (error) {
      captureWithFeature(error, `sign-in-${provider.id}`)
      toast.error(
        error instanceof Error
          ? getAuthErrorMessage(error.message)
          : provider.errorMessage()
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle />
          <DialogDescription />
        </DialogHeader>
        <div className="flex flex-col items-center gap-y-3 sm:gap-y-5 w-full">
          <img
            src="/images/petit-meme-logo.png"
            alt=""
            className="size-10 sm:size-14"
            aria-hidden="true"
          />
          <h1 className="text-lg sm:text-xl font-semibold text-center">
            {m.auth_welcome_title()}
          </h1>
          <Tabs
            value={authType}
            onValueChange={(value) => {
              if (matchIsAuthType(value)) {
                setAuthType(value)
              }
            }}
            className="w-full"
          >
            <TabsList className="w-full auth-tabs-list" data-active={authType}>
              <TabsTrigger
                value="login"
                className="flex-1 transition-colors duration-300"
              >
                {m.auth_login_title()}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex-1 transition-colors duration-300"
              >
                {m.auth_create_account()}
              </TabsTrigger>
            </TabsList>
            <div className="grid [interpolate-size:allow-keywords] pt-4">
              <TabsContent
                forceMount
                value="login"
                className={ANIMATED_TAB_CONTENT_CLASS}
              >
                <LoginForm
                  onOpenChange={onOpenChange}
                  lastLoginMethod={lastLoginMethod}
                />
              </TabsContent>
              <TabsContent
                forceMount
                value="signup"
                className={ANIMATED_TAB_CONTENT_CLASS}
              >
                <SignupForm />
              </TabsContent>
            </div>
          </Tabs>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t w-full">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              {m.auth_or()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full">
            {SOCIAL_PROVIDERS.map((provider) => {
              const isLastUsed = lastLoginMethod === provider.id

              return (
                <Button
                  key={provider.id}
                  variant="outline"
                  className="w-full relative"
                  onClick={() => {
                    return void handleSignInWithSocial(provider)
                  }}
                >
                  <provider.icon />
                  {provider.label()}
                  {isLastUsed ? <LastLoginBadge /> : null}
                </Button>
              )
            })}
          </div>
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}
