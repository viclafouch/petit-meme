import { CheckCircle, CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { passwordWithConfirmationSchema } from '@/constants/auth'
import { getAuthErrorMessage } from '@/helpers/auth-errors'
import { authClient } from '@/lib/auth-client'
import { getFieldErrorMessage } from '@/lib/utils'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

type SignupFormParams = {
  onAuthTypeChange: (authType: 'login' | 'signup') => void
}

const signupSchema = z
  .object({
    name: z.string(),
    email: z.email(),
    acceptTerms: z.literal(true, {
      message: 'Vous devez accepter les conditions pour continuer'
    })
  })
  .and(passwordWithConfirmationSchema)

const signupFormOpts = formOptions({
  defaultValues: {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false as boolean
  },
  validators: {
    onChange: signupSchema
  }
})

const SignupSuccessAlert = () => {
  return (
    <Alert variant="success" className="mt-4">
      <CheckCircle />
      <AlertTitle>Parfait, plus qu&apos;à valider ton email !</AlertTitle>
      <AlertDescription>
        Votre compte a été créé avec succès, mais il doit être activé avant que
        vous puissiez vous connecter. Nous venons de vous envoyer un e-mail pour
        l&apos;activer. Si vous ne le recevez pas dans quelques minutes,
        veuillez vérifier votre dossier spam ou contactez-nous.
      </AlertDescription>
    </Alert>
  )
}

export const SignupForm = ({ onAuthTypeChange }: SignupFormParams) => {
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
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: '/'
      })

      if (error) {
        throw new Error(error.code)
      }
    },
    onSuccess: async () => {
      form.reset()
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
        void form.handleSubmit()
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
      <form.Field
        name="acceptTerms"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage} className="w-full">
              <div className="flex items-start gap-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={field.state.value === true}
                  onCheckedChange={(checked) => {
                    return field.handleChange(checked === true)
                  }}
                  onBlur={field.handleBlur}
                />
                <label
                  htmlFor="acceptTerms"
                  className="text-xs text-muted-foreground leading-snug"
                >
                  J&apos;accepte les{' '}
                  <Link
                    to="/terms-of-use"
                    className="text-info underline"
                    target="_blank"
                  >
                    Conditions Générales d&apos;Utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link
                    to="/privacy"
                    className="text-info underline"
                    target="_blank"
                  >
                    Politique de confidentialité
                  </Link>
                </label>
              </div>
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
      {signupMutation.error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>
            {getAuthErrorMessage(signupMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitted
        }}
        children={(isSubmitted) => {
          return isSubmitted && signupMutation.isSuccess ? (
            <SignupSuccessAlert />
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
