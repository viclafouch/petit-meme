import React from 'react'
import type { ErrorContext } from 'better-auth/react'
import { CheckCircle, CircleAlert, Twitter } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import type { WithDialog } from '@/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/animate-ui/radix/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { authClient, getErrorMessage } from '@/lib/auth-client'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '@/lib/queries'
import { getFieldErrorMessage } from '@/lib/utils'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'

type FormProps = {
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  onTwitterSignIn: (event: React.MouseEvent<HTMLButtonElement>) => void
  onAuthTypeChange: (authType: 'login' | 'signup') => void
}

const loginSchema = z.object({
  email: z.string(),
  password: z.string()
})

const loginFormOpts = formOptions({
  defaultValues: {
    email: '',
    password: ''
  },
  validators: {
    onChange: loginSchema
  }
})

export const LoginForm = ({
  onOpenChange,
  onSuccess,
  onAuthTypeChange,
  onTwitterSignIn
}: FormProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [emailIsNotValid, setEmailIsNotValid] = React.useState(false)

  const signInMutation = useMutation({
    mutationFn: async ({
      email,
      password
    }: {
      email: string
      password: string
    }) => {
      return new Promise((resolve, reject) => {
        authClient.signIn.email(
          {
            email,
            password,
            rememberMe: true
          },
          {
            onError: reject,
            onSuccess: resolve
          }
        )
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOpts())
      await queryClient.invalidateQueries(getActiveSubscriptionQueryOpts())
      router.invalidate()
      onSuccess?.()
    },
    onError: (context: ErrorContext) => {
      if (context.error.code === 'EMAIL_NOT_VERIFIED') {
        setEmailIsNotValid(true)
      } else {
        toast.error(getErrorMessage(context.error, 'fr'))
      }
    }
  })

  const form = useForm({
    ...loginFormOpts,
    onSubmit: async ({ value }) => {
      return signInMutation.mutateAsync({
        email: value.email,
        password: value.password
      })
    }
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
      noValidate
      className="flex flex-col items-center gap-y-4 w-full"
    >
      <form.Field
        name="email"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="jean@dupont.fr"
                  name="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    return field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Field
        name="password"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input
                  required
                  type="password"
                  autoComplete="current-password"
                  placeholder="******"
                  name="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    return field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitting
        }}
        children={(isSubmitting) => {
          return (
            <LoadingButton
              isLoading={isSubmitting}
              type="submit"
              className="w-full"
            >
              Se connecter
            </LoadingButton>
          )
        }}
      />
      <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t w-full">
        <span className="bg-background text-muted-foreground relative z-10 px-2">
          Ou continuer avec
        </span>
      </div>
      <Button variant="outline" className="w-full" onClick={onTwitterSignIn}>
        <Twitter />
        Connexion avec Twitter
      </Button>
      <div className="w-full flex flex-col gap-1 justify-center items-center">
        <Link
          to="/password/reset"
          className="underline text-xs text-primary"
          onClick={() => {
            return onOpenChange?.(false)
          }}
        >
          Mot de passe oublié ?
        </Link>
        <div className="text-center text-sm gap-x-1 inline-flex justify-center w-full text-primary">
          Pas de compte ?
          <button
            onClick={(event) => {
              event.preventDefault()
              onAuthTypeChange('signup')
            }}
            type="button"
            className="underline underline-offset-4 cursor-pointer"
          >
            S&apos;inscrire
          </button>
        </div>
      </div>
      {emailIsNotValid ? (
        <Alert variant="destructive" className="mt-4">
          <CircleAlert />
          <AlertTitle>Vous devez vérifier votre email !</AlertTitle>
          <AlertDescription>
            Votre compte n’est pas activé. Veuillez l’activer avant d’essayer de
            vous connecter. Si vous avez besoin d’aide, contactez-nous.
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

const signupSchema = z
  .object({
    name: z.string(),
    email: z.email(),
    password: z.string().min(8).max(20),
    confirmPassword: z.string().min(8).max(20)
  })
  .refine(
    (data) => {
      return data.password === data.confirmPassword
    },
    {
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword']
    }
  )

const signupFormOpts = formOptions({
  defaultValues: {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  },
  validators: {
    onChange: signupSchema
  }
})

const SignupForm = ({
  onAuthTypeChange
}: Pick<FormProps, 'onAuthTypeChange'>) => {
  const signupMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      name
    }: {
      email: string
      password: string
      name: string
    }) => {
      return new Promise((resolve, reject) => {
        authClient.signUp.email(
          {
            email,
            password,
            name,
            callbackURL: '/'
          },
          {
            onError: reject,
            onSuccess: resolve
          }
        )
      })
    },
    onSuccess: async () => {
      form.reset()
    },
    onError: (context: ErrorContext) => {
      toast.error(getErrorMessage(context.error, 'fr'))
    }
  })

  const form = useForm({
    ...signupFormOpts,
    onSubmit: async ({ value }) => {
      return signupMutation.mutateAsync({
        email: value.email,
        password: value.password,
        name: value.name
      })
    }
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
      noValidate
      className="flex flex-col items-center gap-y-4 w-full"
    >
      <form.Field
        name="name"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>Pseudo</FormLabel>
              <FormControl>
                <Input
                  required
                  type="text"
                  autoComplete="username"
                  placeholder="Jean"
                  name="name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    return field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Field
        name="email"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="jean@dupont.fr"
                  name="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    return field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Field
        name="password"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="******"
                  name="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    return field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Field
        name="confirmPassword"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>Confirmer le mot de passe</FormLabel>
              <FormControl>
                <Input
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="******"
                  name="confirmPassword"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    return field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitting
        }}
        children={(isSubmitting) => {
          return (
            <LoadingButton
              isLoading={isSubmitting}
              type="submit"
              className="w-full"
            >
              Créer un compte
            </LoadingButton>
          )
        }}
      />
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitted
        }}
        children={(isSubmitted) => {
          return isSubmitted && signupMutation.isSuccess ? (
            <Alert variant="success" className="mt-4">
              <CheckCircle />
              <AlertTitle>
                Parfait, plus qu&apos;à valider ton email !
              </AlertTitle>
              <AlertDescription>
                Votre compte a été créé avec succès, mais il doit être activé
                avant que vous puissiez vous connecter. Nous venons de vous
                envoyer un e-mail pour l’activer. Si vous ne le recevez pas dans
                quelques minutes, veuillez vérifier votre dossier spam ou
                contactez-nous.
              </AlertDescription>
            </Alert>
          ) : null
        }}
      />
      <div className="text-center text-sm gap-x-1 inline-flex justify-center w-full text-primary">
        Déjà un compte ?
        <button
          onClick={(event) => {
            event.preventDefault()
            onAuthTypeChange('login')
          }}
          type="button"
          className="underline underline-offset-4 cursor-pointer"
        >
          Se connecter
        </button>
      </div>
    </form>
  )
}

export const AuthDialog = ({ open, onOpenChange }: WithDialog<unknown>) => {
  const [authType, setAuthType] = React.useState<'login' | 'signup'>('login')

  const handleSignInWithTwitter = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
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
