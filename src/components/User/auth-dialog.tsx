import React from 'react'
import type { WithDialog } from '@/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/animate-ui/radix/dialog'
import { LoginForm } from '@/components/User/login-form'
import { SignupForm } from '@/components/User/signup-form'
import { authClient } from '@/lib/auth-client'
import { track } from '@/lib/mixpanel'

export const AuthDialog = ({ open, onOpenChange }: WithDialog<unknown>) => {
  const [authType, setAuthType] = React.useState<'login' | 'signup'>('login')

  const handleSignInWithTwitter = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    track('Sign In', {
      loginMethod: 'twitter',
      success: true
    })
    await authClient.signIn.social({
      provider: 'twitter'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onOpenAutoFocus={(event) => {
          return event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle />
          <DialogDescription />
        </DialogHeader>
        <div className="flex flex-col items-center gap-y-6 w-full">
          <h1 className="text-xl font-semibold text-center text-balance max-w-sm mx-center">
            {authType === 'login' ? 'Connexion' : 'Inscription'}
          </h1>
          {authType === 'login' ? (
            <LoginForm
              onAuthTypeChange={setAuthType}
              onOpenChange={onOpenChange}
              onTwitterSignIn={handleSignInWithTwitter}
              onSuccess={() => {
                return onOpenChange(false)
              }}
            />
          ) : (
            <SignupForm onAuthTypeChange={setAuthType} />
          )}
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}
