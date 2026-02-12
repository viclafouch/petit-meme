import { Ban } from 'lucide-react'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CreateNewPasswordForm } from '@/components/User/create-new-password-form'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'

const RouteComponent = () => {
  const search = Route.useSearch()

  if (search.error === 'INVALID_TOKEN') {
    return (
      <div className="max-w-lg mx-auto">
        <Alert variant="destructive">
          <Ban />
          <AlertTitle>Il semblerait que votre lien soit invalide !</AlertTitle>
          <AlertDescription>
            Le lien de réinitialisation de mot de passe n’est plus valide ou est
            incorrect.
            <br />
            <br />
            <Link to="/password/reset" className="underline">
              Demander un nouveau lien de réinitialisation
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!search.token) {
    return <Navigate to="/" />
  }

  return (
    <div className="flex justify-center">
      <div className="min-w-md border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-6 py-8 shadow-md">
        <CreateNewPasswordForm token={search.token} />
      </div>
    </div>
  )
}

export const Route = createFileRoute(
  '/_public__root/_default/password/create-new'
)({
  validateSearch: (search) => {
    return z
      .object({
        // eslint-disable-next-line unicorn/no-useless-undefined
        token: z.string().optional().catch(undefined),
        // eslint-disable-next-line unicorn/no-useless-undefined
        error: z.literal('INVALID_TOKEN').optional().catch(undefined)
      })
      .parse(search)
  },
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        { title: 'Petit Meme - Nouveau mot de passe' },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
